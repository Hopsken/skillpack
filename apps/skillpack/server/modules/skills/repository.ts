import {
  skillResourcesTable,
  skillsTable,
  skillSnapshotsTable,
} from "@server/db/schema";
import type { SkillFileMetadata } from "@server/shared/skill-file";
import type { Database } from "@server/types";
import type {
  SkillOriginJson,
  SkillSnapshotStateJson,
} from "@skillpack/contracts/skills/state";
import { eq as sqlEq, sql } from "drizzle-orm";

import { skillErrors } from "./errors";
import type { SkillResourceRow, StoredResourceObject } from "./types";

interface SkillOriginInput {
  kind: "github";
  metadata: Record<string, unknown> | null;
  url: string;
}

interface CreateSkillInput {
  name: string;
  origin?: SkillOriginInput;
  resources: StoredResourceObject[];
  skillFileMetadata: Omit<SkillFileMetadata, "name">;
}

interface UpdateSkillStateInput {
  name: string;
  origin?: SkillOriginInput | null;
  resources: StoredResourceObject[];
  skillFileMetadata: Omit<SkillFileMetadata, "name">;
  skillId: number;
}

interface CreateSkillSnapshotInput {
  label?: string;
  note?: string;
  resources: SkillResourceRow[];
  skill: {
    allowedTools: string | null;
    compatibility: string | null;
    description: string;
    license: string | null;
    metadata: Record<string, string> | null;
    name: string;
    origin: SkillOriginJson | null;
  };
  skillId: number;
}

const snapshotStateVersion = 1;

const isUniqueConstraintError = (error: unknown): error is Error =>
  error instanceof Error && error.message.includes("UNIQUE constraint failed");

const isUniqueSkillSnapshotError = (error: unknown) =>
  isUniqueConstraintError(error) && error.message.includes("skill_snapshots");

const isUniqueSkillNameError = (error: unknown) =>
  isUniqueConstraintError(error) && error.message.includes("skills");

const toOriginJson = (
  origin?: SkillOriginInput | null
): SkillOriginJson | null =>
  origin
    ? {
        kind: origin.kind,
        metadata: origin.metadata,
        url: origin.url,
      }
    : null;

const toSnapshotResource = (
  resource: SkillResourceRow | StoredResourceObject
) => ({
  mediaType: resource.mediaType,
  path: resource.path,
  sha256: resource.sha256,
  size: resource.size,
});

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
    });

    return rows.map((skill) => ({ skill }));
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

  async listSkillSnapshots(skillId: number) {
    return await this.db.query.skillSnapshotsTable.findMany({
      orderBy: (snapshots, { desc }) => [desc(snapshots.snapshotNumber)],
      where: (snapshots, { eq }) => eq(snapshots.skillId, skillId),
    });
  }

  async findSkillSnapshotByNumber(skillId: number, snapshotNumber: number) {
    return await this.db.query.skillSnapshotsTable.findFirst({
      where: (snapshots, { and, eq }) =>
        and(
          eq(snapshots.skillId, skillId),
          eq(snapshots.snapshotNumber, snapshotNumber)
        ),
    });
  }

  async listResourcesBySkillId(skillId: number) {
    return await this.db.query.skillResourcesTable.findMany({
      where: (resources, { eq }) => eq(resources.skillId, skillId),
    });
  }

  async findResourceByPath(skillId: number, path: string) {
    return await this.db.query.skillResourcesTable.findFirst({
      where: (resources, { and, eq }) =>
        and(eq(resources.skillId, skillId), eq(resources.path, path)),
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
    const skillInsert = this.db
      .insert(skillsTable)
      .values({
        allowedTools: input.skillFileMetadata.allowedTools ?? null,
        compatibility: input.skillFileMetadata.compatibility ?? null,
        createdAt: now,
        description: input.skillFileMetadata.description,
        license: input.skillFileMetadata.license ?? null,
        metadata: input.skillFileMetadata.metadata ?? null,
        name: input.name,
        origin: toOriginJson(input.origin),
        ownerUserId: this.ownerUserId,
        updatedAt: now,
      })
      .returning();
    const resourceInsert =
      input.resources.length > 0
        ? this.db.insert(skillResourcesTable).values(
            input.resources.map((resource) => ({
              createdAt: now,
              mediaType: resource.mediaType,
              path: resource.path,
              sha256: resource.sha256,
              size: resource.size,
              skillId: createdSkillId,
            }))
          )
        : undefined;

    try {
      const [skillRows] = await this.db.batch(
        resourceInsert ? [skillInsert, resourceInsert] : [skillInsert]
      );
      const [skill] = skillRows;

      if (!skill) {
        throw new Error("Skill was not created");
      }

      return { skill };
    } catch (error) {
      if (isUniqueSkillNameError(error)) {
        throw skillErrors.duplicateSkillName();
      }

      throw error;
    }
  }

  async updateSkillState(input: UpdateSkillStateInput, now: Date) {
    const skillUpdate = this.db
      .update(skillsTable)
      .set({
        allowedTools: input.skillFileMetadata.allowedTools ?? null,
        compatibility: input.skillFileMetadata.compatibility ?? null,
        description: input.skillFileMetadata.description,
        license: input.skillFileMetadata.license ?? null,
        metadata: input.skillFileMetadata.metadata ?? null,
        name: input.name,
        origin: toOriginJson(input.origin),
        updatedAt: now,
      })
      .where(sqlEq(skillsTable.id, input.skillId))
      .returning();
    const resourceDelete = this.db
      .delete(skillResourcesTable)
      .where(sqlEq(skillResourcesTable.skillId, input.skillId));
    const resourceInsert =
      input.resources.length > 0
        ? this.db.insert(skillResourcesTable).values(
            input.resources.map((resource) => ({
              createdAt: now,
              mediaType: resource.mediaType,
              path: resource.path,
              sha256: resource.sha256,
              size: resource.size,
              skillId: input.skillId,
            }))
          )
        : undefined;

    try {
      const [skillRows] = await this.db.batch(
        resourceInsert
          ? [skillUpdate, resourceDelete, resourceInsert]
          : [skillUpdate, resourceDelete]
      );
      const [skill] = skillRows;

      if (!skill) {
        throw skillErrors.skillNotFound();
      }

      return skill;
    } catch (error) {
      if (isUniqueSkillNameError(error)) {
        throw skillErrors.duplicateSkillName();
      }

      throw error;
    }
  }

  async createSkillSnapshot(input: CreateSkillSnapshotInput, now: Date) {
    const stateJson: SkillSnapshotStateJson = {
      allowedTools: input.skill.allowedTools,
      compatibility: input.skill.compatibility,
      description: input.skill.description,
      license: input.skill.license,
      metadata: input.skill.metadata,
      name: input.skill.name,
      origin: input.skill.origin,
      resources: input.resources.map(toSnapshotResource),
    };

    try {
      const [snapshot] = await this.db
        .insert(skillSnapshotsTable)
        .values({
          createdAt: now,
          label: input.label ?? null,
          note: input.note ?? null,
          skillId: input.skillId,
          snapshotNumber: sql<number>`(
            select coalesce(max(${skillSnapshotsTable.snapshotNumber}), 0) + 1
            from ${skillSnapshotsTable}
            where ${skillSnapshotsTable.skillId} = ${input.skillId}
          )`,
          stateJson,
          stateVersion: snapshotStateVersion,
        })
        .returning();

      if (!snapshot) {
        throw new Error("Skill snapshot was not created");
      }

      return snapshot;
    } catch (error) {
      if (isUniqueSkillSnapshotError(error)) {
        throw skillErrors.duplicateSkillSnapshot();
      }

      throw error;
    }
  }

  async deleteSkillById(skillId: number) {
    const skill = await this.findSkillById(skillId);

    if (!skill) {
      return;
    }

    await this.db
      .delete(skillResourcesTable)
      .where(sqlEq(skillResourcesTable.skillId, skillId));
    await this.db
      .delete(skillSnapshotsTable)
      .where(sqlEq(skillSnapshotsTable.skillId, skillId));
    await this.db.delete(skillsTable).where(sqlEq(skillsTable.id, skillId));
  }
}
