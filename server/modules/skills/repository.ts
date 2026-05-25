import {
  skillOriginsTable,
  skillResourcesTable,
  skillsTable,
  skillVersionsTable,
} from "@server/db/schema";
import type { Database } from "@server/types";
import { eq as sqlEq, inArray } from "drizzle-orm";

import type { StoredResourceObject } from "./types";

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

  async findLatestVersionNumber(skillId: number) {
    const version = await this.db.query.skillVersionsTable.findFirst({
      columns: { versionNumber: true },
      orderBy: (versions, { desc }) => [desc(versions.versionNumber)],
      where: (versions, { eq }) => eq(versions.skillId, skillId),
    });

    return version?.versionNumber ?? 0;
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

  updateSkillCurrentVersion(input: {
    currentVersionId: number;
    name?: string;
    skillId: number;
    updatedAt: Date;
  }) {
    return this.db
      .update(skillsTable)
      .set({
        currentVersionId: input.currentVersionId,
        name: input.name,
        updatedAt: input.updatedAt,
      })
      .where(sqlEq(skillsTable.id, input.skillId));
  }

  async insertSkillVersion(
    input: {
      changeSummary?: string;
      description: string;
      label?: string;
      skillId: number;
      versionNumber: number;
    },
    now: Date
  ) {
    const [version] = await this.db
      .insert(skillVersionsTable)
      .values({
        changeSummary: input.changeSummary ?? null,
        createdAt: now,
        description: input.description,
        label: input.label ?? null,
        skillId: input.skillId,
        versionNumber: input.versionNumber,
      })
      .returning();

    if (!version) {
      throw new Error("Skill version was not created");
    }

    return version;
  }

  insertSkillResources(
    skillVersionId: number,
    resources: StoredResourceObject[],
    now: Date
  ) {
    if (resources.length === 0) {
      return;
    }

    return this.db.insert(skillResourcesTable).values(
      resources.map((resource) => ({
        createdAt: now,
        mediaType: resource.mediaType,
        path: resource.path,
        sha256: resource.sha256,
        size: resource.size,
        skillVersionId,
      }))
    );
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
