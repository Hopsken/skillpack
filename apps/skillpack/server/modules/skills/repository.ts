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

interface CommitSkillVersionOriginInput {
  kind: "github";
  metadata: Record<string, unknown> | null;
  url: string;
}

interface CreateSkillInput {
  changeSummary?: string | null;
  label?: string;
  name: string;
  origin?: CommitSkillVersionOriginInput;
  resources: StoredResourceObject[];
  skillFileMetadata: Omit<SkillFileMetadata, "name">;
}

const isUniqueConstraintError = (error: unknown): error is Error =>
  error instanceof Error && error.message.includes("UNIQUE constraint failed");

const isUniqueSkillVersionError = (error: unknown) =>
  isUniqueConstraintError(error) && error.message.includes("skill_versions");

const isUniqueSkillNameError = (error: unknown) =>
  isUniqueConstraintError(error) && error.message.includes("skills");

const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

export class SkillRepository {
  private readonly db: Database;

  private readonly ownerUserId: string;

  constructor(db: Database, ownerUserId: string) {
    this.db = db;
    this.ownerUserId = ownerUserId;
  }

  async listSkills() {
    const rows = await this.db.query.skillsTable.findMany({
      orderBy: (skills, { desc }) => [desc(skills.updatedAt)],
      where: (skills, { eq }) => eq(skills.ownerUserId, this.ownerUserId),
      with: {
        versions: {
          limit: 1,
          orderBy: (versions, { desc }) => [desc(versions.versionNumber)],
          with: { origins: true },
        },
      },
    });

    return rows.flatMap((row) => {
      const [version] = row.versions;

      if (!version) {
        return [];
      }

      return [{ origin: version.origins.at(0), skill: row, version }];
    });
  }

  async findSkillById(skillId: number) {
    return await this.db.query.skillsTable.findFirst({
      where: (skills, { and, eq }) =>
        and(eq(skills.id, skillId), eq(skills.ownerUserId, this.ownerUserId)),
    });
  }

  async findSkillByName(name: string) {
    return await this.db.query.skillsTable.findFirst({
      where: (skills, { and, eq }) =>
        and(eq(skills.ownerUserId, this.ownerUserId), eq(skills.name, name)),
    });
  }

  async findLatestSkillVersion(skillId: number) {
    return await this.db.query.skillVersionsTable.findFirst({
      orderBy: (versions, { desc }) => [desc(versions.versionNumber)],
      where: (versions, { eq }) => eq(versions.skillId, skillId),
    });
  }

  async findSkillVersionByNumber(skillId: number, versionNumber: number) {
    return await this.db.query.skillVersionsTable.findFirst({
      where: (versions, { and, eq }) =>
        and(
          eq(versions.skillId, skillId),
          eq(versions.versionNumber, versionNumber)
        ),
    });
  }

  async findSkillOrigin(skillVersionId: number) {
    return await this.db.query.skillOriginsTable.findFirst({
      where: (origins, { eq }) => eq(origins.skillVersionId, skillVersionId),
    });
  }

  async listSkillVersions(skillId: number) {
    return await this.db.query.skillVersionsTable.findMany({
      orderBy: (versions, { desc }) => [desc(versions.versionNumber)],
      where: (versions, { eq }) => eq(versions.skillId, skillId),
    });
  }

  async listResourcesByVersionId(skillVersionId: number) {
    return await this.db.query.skillResourcesTable.findMany({
      where: (resources, { eq }) =>
        eq(resources.skillVersionId, skillVersionId),
    });
  }

  async findResourceByPath(skillVersionId: number, path: string) {
    return await this.db.query.skillResourcesTable.findFirst({
      where: (resources, { and, eq }) =>
        and(
          eq(resources.skillVersionId, skillVersionId),
          eq(resources.path, path)
        ),
    });
  }

  async createSkill(input: CreateSkillInput, now: Date) {
    const createdSkillId = sql<number>`(
      select ${skillsTable.id}
      from ${skillsTable}
      where ${skillsTable.ownerUserId} = ${this.ownerUserId}
        and ${skillsTable.name} = ${input.name}
      limit 1
    )`;
    const createdVersionId = sql<number>`(
      select ${skillVersionsTable.id}
      from ${skillVersionsTable}
      where ${skillVersionsTable.skillId} = ${createdSkillId}
        and ${skillVersionsTable.versionNumber} = 1
      limit 1
    )`;
    const skillInsert = this.db
      .insert(skillsTable)
      .values({
        createdAt: now,
        name: input.name,
        ownerUserId: this.ownerUserId,
        updatedAt: now,
      })
      .returning();
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
        skillId: createdSkillId,
        versionNumber: 1,
      })
      .returning();
    const originInsert = input.origin
      ? this.db.insert(skillOriginsTable).values({
          createdAt: now,
          kind: input.origin.kind,
          metadata: input.origin.metadata,
          skillVersionId: createdVersionId,
          updatedAt: now,
          url: input.origin.url,
        })
      : undefined;
    const resourceInsert =
      input.resources.length > 0
        ? this.db.insert(skillResourcesTable).values(
            input.resources.map((resource) => ({
              createdAt: now,
              mediaType: resource.mediaType,
              path: resource.path,
              sha256: resource.sha256,
              size: resource.size,
              skillVersionId: createdVersionId,
            }))
          )
        : undefined;
    const batchStatements = [
      skillInsert,
      versionInsert,
      ...[resourceInsert, originInsert].filter(isDefined),
    ] as const;

    try {
      const [skillRows, versionRows] = await this.db.batch(batchStatements);
      const [skill] = skillRows;
      const [version] = versionRows;

      if (!(skill && version)) {
        throw new Error("Skill was not created");
      }

      return { skill, version };
    } catch (error) {
      if (isUniqueSkillNameError(error)) {
        throw skillErrors.duplicateSkillName();
      }

      if (isUniqueSkillVersionError(error)) {
        throw skillErrors.duplicateSkillVersion();
      }

      throw error;
    }
  }

  async commitSkillVersion(
    input: {
      changeSummary?: string | null;
      label?: string;
      origin?: CommitSkillVersionOriginInput;
      resources: StoredResourceObject[];
      skillFileMetadata: Omit<SkillFileMetadata, "name">;
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
    const originInsert = input.origin
      ? this.db.insert(skillOriginsTable).values({
          createdAt: now,
          kind: input.origin.kind,
          metadata: input.origin.metadata,
          skillVersionId: committedVersionId,
          updatedAt: now,
          url: input.origin.url,
        })
      : undefined;
    const resourceInsert =
      input.resources.length > 0
        ? this.db.insert(skillResourcesTable).values(
            input.resources.map((resource) => ({
              createdAt: now,
              mediaType: resource.mediaType,
              path: resource.path,
              sha256: resource.sha256,
              size: resource.size,
              skillVersionId: committedVersionId,
            }))
          )
        : undefined;
    const batchStatements = [
      versionInsert,
      ...[resourceInsert, originInsert].filter(isDefined),
      skillUpdate,
    ] as const;

    try {
      const [versionRows] = await this.db.batch(batchStatements);

      const [version] = versionRows;

      if (!version) {
        throw new Error("Skill version was not created");
      }

      return version;
    } catch (error) {
      if (isUniqueSkillVersionError(error)) {
        throw skillErrors.duplicateSkillVersion();
      }

      throw error;
    }
  }

  async deleteSkillById(skillId: number) {
    const skill = await this.findSkillById(skillId);

    if (!skill) {
      return;
    }

    const versions = await this.db.query.skillVersionsTable.findMany({
      columns: { id: true },
      where: (version, { eq }) => eq(version.skillId, skillId),
    });
    const versionIds = versions.map((version) => version.id);

    if (versionIds.length > 0) {
      await this.db
        .delete(skillResourcesTable)
        .where(inArray(skillResourcesTable.skillVersionId, versionIds));
      await this.db
        .delete(skillOriginsTable)
        .where(inArray(skillOriginsTable.skillVersionId, versionIds));
    }

    await this.db
      .delete(skillVersionsTable)
      .where(sqlEq(skillVersionsTable.skillId, skillId));
    await this.db.delete(skillsTable).where(sqlEq(skillsTable.id, skillId));
  }
}
