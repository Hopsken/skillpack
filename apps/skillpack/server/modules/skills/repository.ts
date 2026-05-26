import {
  skillOriginsTable,
  skillResourcesTable,
  skillsTable,
  skillVersionsTable,
} from "@server/db/schema";
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
      where: (skills, { isNotNull }) => isNotNull(skills.currentVersionId),
      with: {
        currentVersion: true,
        origins: true,
      },
    });

    return rows.flatMap((row) => {
      if (!row.currentVersion) {
        return [];
      }

      return [
        {
          origin: row.origins.at(0),
          skill: row,
          version: row.currentVersion,
        },
      ];
    });
  }

  findSkillById(skillId: number) {
    return this.db.query.skillsTable.findFirst({
      where: (skills, { eq }) => eq(skills.id, skillId),
    });
  }

  findCurrentSkillVersion(currentVersionId: number) {
    return this.db.query.skillVersionsTable.findFirst({
      where: (versions, { eq }) => eq(versions.id, currentVersionId),
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

  async insertSkill(name: string, now: Date) {
    const [skill] = await this.db
      .insert(skillsTable)
      .values({
        createdAt: now,
        name,
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
      changeSummary?: string;
      description: string;
      label?: string;
      name?: string;
      resources: StoredResourceObject[];
      skillId: number;
    },
    now: Date
  ) {
    // D1 batch statements are submitted together, so later statements cannot
    // await the inserted version id in JS. Keep the version/resource/current
    // pointer commit atomic by resolving the just-inserted version inside SQL.
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
    const skillUpdate = {
      currentVersionId: committedVersionId,
      updatedAt: now,
      ...(input.name ? { name: input.name } : {}),
    };

    try {
      const [versionRows] = await this.db.batch([
        this.db
          .insert(skillVersionsTable)
          .values({
            changeSummary: input.changeSummary ?? null,
            createdAt: now,
            description: input.description,
            label: input.label ?? null,
            skillId: input.skillId,
            versionNumber: sql<number>`(
              select coalesce(max(${skillVersionsTable.versionNumber}), 0) + 1
              from ${skillVersionsTable}
              where ${skillVersionsTable.skillId} = ${input.skillId}
            )`,
          })
          .returning(),
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
        this.db
          .update(skillsTable)
          .set(skillUpdate)
          .where(sqlEq(skillsTable.id, input.skillId)),
      ]);

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

    await this.db
      .update(skillsTable)
      .set({ currentVersionId: null })
      .where(sqlEq(skillsTable.id, skillId));

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
