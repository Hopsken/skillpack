import {
  skillOriginsTable,
  skillResourcesTable,
  skillsTable,
  skillVersionsTable,
} from "@server/db/schema";
import type { SkillFileMetadata } from "@server/shared/skill-file";
import type { Database } from "@server/types";
import { eq as sqlEq, inArray, sql } from "drizzle-orm";

import { skillErrors } from "./errors";
import type { StoredResourceObject } from "./types";

const isUniqueConstraintError = (error: unknown) =>
  error instanceof Error &&
  error.message.includes("UNIQUE constraint failed") &&
  error.message.includes("skill_versions");

export class SkillRepository {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async listSkills() {
    const rows = await this.db.query.skillsTable.findMany({
      orderBy: (skills, { desc }) => [desc(skills.updatedAt)],
      with: {
        origins: true,
        versions: {
          limit: 1,
          orderBy: (versions, { desc }) => [desc(versions.versionNumber)],
        },
      },
    });

    return rows.flatMap((row) => {
      const [version] = row.versions;

      if (!version) {
        return [];
      }

      return [{ origin: row.origins.at(0), skill: row, version }];
    });
  }

  findSkillById(skillId: number) {
    return this.db.query.skillsTable.findFirst({
      where: (skills, { eq }) => eq(skills.id, skillId),
    });
  }

  findLatestSkillVersion(skillId: number) {
    return this.db.query.skillVersionsTable.findFirst({
      orderBy: (versions, { desc }) => [desc(versions.versionNumber)],
      where: (versions, { eq }) => eq(versions.skillId, skillId),
    });
  }

  findSkillVersionByNumber(skillId: number, versionNumber: number) {
    return this.db.query.skillVersionsTable.findFirst({
      where: (versions, { and, eq }) =>
        and(
          eq(versions.skillId, skillId),
          eq(versions.versionNumber, versionNumber)
        ),
    });
  }

  findSkillOrigin(skillId: number) {
    return this.db.query.skillOriginsTable.findFirst({
      where: (origins, { eq }) => eq(origins.skillId, skillId),
    });
  }

  listSkillVersions(skillId: number) {
    return this.db.query.skillVersionsTable.findMany({
      orderBy: (versions, { desc }) => [desc(versions.versionNumber)],
      where: (versions, { eq }) => eq(versions.skillId, skillId),
    });
  }

  listResourcesByVersionId(skillVersionId: number) {
    return this.db.query.skillResourcesTable.findMany({
      where: (resources, { eq }) =>
        eq(resources.skillVersionId, skillVersionId),
    });
  }

  findResourceByPath(skillVersionId: number, path: string) {
    return this.db.query.skillResourcesTable.findFirst({
      where: (resources, { and, eq }) =>
        and(
          eq(resources.skillVersionId, skillVersionId),
          eq(resources.path, path)
        ),
    });
  }

  async insertSkill(now: Date) {
    const [skill] = await this.db
      .insert(skillsTable)
      .values({
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!skill) {
      throw new Error("Skill was not created");
    }

    return skill;
  }

  async commitSkillVersion(
    input: {
      changeSummary?: string | null;
      label?: string;
      resources: StoredResourceObject[];
      skillFileMetadata: SkillFileMetadata;
      skillId: number;
    },
    now: Date
  ) {
    // D1 batch statements are submitted together, so later statements cannot
    // await the inserted version id in JS. Resolve the just-inserted version
    // inside SQL while keeping version/resources/skill update in one batch.
    const committedVersionId = sql<number>`(
      select ${skillVersionsTable.id}
      from ${skillVersionsTable}
      where ${skillVersionsTable.skillId} = ${input.skillId}
        and ${skillVersionsTable.versionNumber} = (
          select max(${skillVersionsTable.versionNumber})
          from ${skillVersionsTable}
          where ${skillVersionsTable.skillId} = ${input.skillId}
        )
      limit 1
    )`;
    const versionInsert = this.db
      .insert(skillVersionsTable)
      .values({
        allowedTools: input.skillFileMetadata.allowedTools ?? null,
        changeSummary: input.changeSummary ?? null,
        compatibility: input.skillFileMetadata.compatibility ?? null,
        createdAt: now,
        description: input.skillFileMetadata.description,
        label: input.label ?? null,
        license: input.skillFileMetadata.license ?? null,
        metadata: input.skillFileMetadata.metadata ?? null,
        name: input.skillFileMetadata.name,
        skillId: input.skillId,
        versionNumber: sql<number>`(
          select coalesce(max(${skillVersionsTable.versionNumber}), 0) + 1
          from ${skillVersionsTable}
          where ${skillVersionsTable.skillId} = ${input.skillId}
        )`,
      })
      .returning();
    const skillUpdate = this.db
      .update(skillsTable)
      .set({ updatedAt: now })
      .where(sqlEq(skillsTable.id, input.skillId));

    try {
      const [versionRows] =
        input.resources.length > 0
          ? await this.db.batch([
              versionInsert,
              this.db.insert(skillResourcesTable).values(
                input.resources.map((resource) => ({
                  createdAt: now,
                  mediaType: resource.mediaType,
                  path: resource.path,
                  sha256: resource.sha256,
                  size: resource.size,
                  skillVersionId: committedVersionId,
                }))
              ),
              skillUpdate,
            ])
          : await this.db.batch([versionInsert, skillUpdate]);

      const [version] = versionRows;

      if (!version) {
        throw new Error("Skill version was not created");
      }

      return version;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw skillErrors.duplicateSkillVersion();
      }

      throw error;
    }
  }

  insertSkillOrigin(
    input: {
      kind: "github";
      metadata: Record<string, unknown> | null;
      skillId: number;
      url: string;
    },
    now: Date
  ) {
    return this.db.insert(skillOriginsTable).values({
      createdAt: now,
      kind: input.kind,
      metadata: input.metadata,
      skillId: input.skillId,
      updatedAt: now,
      url: input.url,
    });
  }

  async deleteSkillById(skillId: number) {
    const versions = await this.db.query.skillVersionsTable.findMany({
      columns: { id: true },
      where: (version, { eq }) => eq(version.skillId, skillId),
    });
    const versionIds = versions.map((version) => version.id);

    if (versionIds.length > 0) {
      await this.db
        .delete(skillResourcesTable)
        .where(inArray(skillResourcesTable.skillVersionId, versionIds));
    }

    await this.db
      .delete(skillOriginsTable)
      .where(sqlEq(skillOriginsTable.skillId, skillId));
    await this.db
      .delete(skillVersionsTable)
      .where(sqlEq(skillVersionsTable.skillId, skillId));
    await this.db.delete(skillsTable).where(sqlEq(skillsTable.id, skillId));
  }
}
