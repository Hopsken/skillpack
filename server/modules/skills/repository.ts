import { createDb } from "@server/db/client";
import { skillResources, skillVersions, skills } from "@server/db/schema";
import { and, eq, inArray } from "drizzle-orm";

import type { StoredResourceObject } from "./types";

export const listSkills = (database: D1Database) => {
  const db = createDb(database);
  return db.select().from(skills).all();
};

export const findSkillByName = async (database: D1Database, name: string) => {
  const db = createDb(database);
  const [skill] = await db
    .select()
    .from(skills)
    .where(eq(skills.name, name))
    .limit(1);

  return skill;
};

export const findSkillVersion = async (
  database: D1Database,
  skillId: number,
  versionName: string
) => {
  const db = createDb(database);
  const [version] = await db
    .select()
    .from(skillVersions)
    .where(
      and(
        eq(skillVersions.skillId, skillId),
        eq(skillVersions.version, versionName)
      )
    )
    .limit(1);

  return version;
};

export const listSkillVersions = (database: D1Database, skillId: number) => {
  const db = createDb(database);
  return db
    .select()
    .from(skillVersions)
    .where(eq(skillVersions.skillId, skillId))
    .all();
};

export const listResourcesByVersionId = (
  database: D1Database,
  skillVersionId: number
) => {
  const db = createDb(database);
  return db
    .select()
    .from(skillResources)
    .where(eq(skillResources.skillVersionId, skillVersionId))
    .all();
};

export const findResourceByPath = async (
  database: D1Database,
  skillVersionId: number,
  path: string
) => {
  const db = createDb(database);
  const [resource] = await db
    .select()
    .from(skillResources)
    .where(
      and(
        eq(skillResources.skillVersionId, skillVersionId),
        eq(skillResources.path, path)
      )
    )
    .limit(1);

  return resource;
};

export const insertSkillWithVersion = async (
  database: D1Database,
  input: {
    contentObjectKey: string;
    description: string;
    name: string;
    resources: StoredResourceObject[];
    sha256: string;
    version: string;
  }
) => {
  const db = createDb(database);
  const now = new Date();
  const [skill] = await db
    .insert(skills)
    .values({
      createdAt: now,
      description: input.description,
      latestVersion: input.version,
      name: input.name,
      updatedAt: now,
    })
    .returning();

  if (!skill) {
    return;
  }

  const [version] = await db
    .insert(skillVersions)
    .values({
      createdAt: now,
      entryPath: "SKILL.md",
      objectKey: input.contentObjectKey,
      sha256: input.sha256,
      skillId: skill.id,
      version: input.version,
    })
    .returning();

  if (!version) {
    return;
  }

  if (input.resources.length > 0) {
    await db.insert(skillResources).values(
      input.resources.map((resource) => ({
        createdAt: now,
        mediaType: resource.mediaType,
        objectKey: resource.objectKey,
        path: resource.path,
        sha256: resource.sha256,
        size: resource.size,
        skillVersionId: version.id,
      }))
    );
  }

  return { skill, version };
};

export const deleteSkillById = async (
  database: D1Database,
  skillId: number
) => {
  const db = createDb(database);
  const versions = await db
    .select({ id: skillVersions.id })
    .from(skillVersions)
    .where(eq(skillVersions.skillId, skillId))
    .all();
  const versionIds = versions.map((version) => version.id);

  if (versionIds.length > 0) {
    await db
      .delete(skillResources)
      .where(inArray(skillResources.skillVersionId, versionIds));
  }

  await db.delete(skillVersions).where(eq(skillVersions.skillId, skillId));
  await db.delete(skills).where(eq(skills.id, skillId));
};
