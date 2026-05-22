import {
  skillsTable,
  skillResourcesTable,
  skillVersionsTable,
} from "@server/db/schema";
import type { Database } from "@server/types";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import type { StoredResourceObject } from "./types";

interface InsertVersionInput {
  contentObjectKey: string;
  location: string;
  resources: StoredResourceObject[];
  resolvedLocation: string;
  sha256: string;
  skillId: number;
  version: string;
}

type SkillBatch = [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]];

export const listSkills = (db: Database) => db.select().from(skillsTable).all();

export const findSkillByLocation = async (
  db: Database,
  sourceType: string,
  handle: string
) => {
  const [skill] = await db
    .select()
    .from(skillsTable)
    .where(
      and(
        eq(skillsTable.sourceType, sourceType),
        eq(skillsTable.handle, handle)
      )
    )
    .limit(1);

  return skill;
};

export const findSkillVersion = async (
  db: Database,
  skillId: number,
  versionName: string
) => {
  const [version] = await db
    .select()
    .from(skillVersionsTable)
    .where(
      and(
        eq(skillVersionsTable.skillId, skillId),
        eq(skillVersionsTable.version, versionName)
      )
    )
    .limit(1);

  return version;
};

export const listSkillVersions = (db: Database, skillId: number) =>
  db
    .select()
    .from(skillVersionsTable)
    .where(eq(skillVersionsTable.skillId, skillId))
    .all();

export const listResourcesByVersionId = (
  db: Database,
  skillVersionId: number
) =>
  db
    .select()
    .from(skillResourcesTable)
    .where(eq(skillResourcesTable.skillVersionId, skillVersionId))
    .all();

export const findResourceByPath = async (
  db: Database,
  skillVersionId: number,
  path: string
) => {
  const [resource] = await db
    .select()
    .from(skillResourcesTable)
    .where(
      and(
        eq(skillResourcesTable.skillVersionId, skillVersionId),
        eq(skillResourcesTable.path, path)
      )
    )
    .limit(1);

  return resource;
};

const insertVersionStatement = (
  db: Database,
  input: InsertVersionInput,
  now: Date
) =>
  db.insert(skillVersionsTable).values({
    approvedAt: now,
    createdAt: now,
    entryPath: "SKILL.md",
    location: input.location,
    objectKey: input.contentObjectKey,
    resolvedLocation: input.resolvedLocation,
    sha256: input.sha256,
    skillId: input.skillId,
    version: input.version,
  });

const insertVersionForLocationStatement = (
  db: Database,
  input: Omit<InsertVersionInput, "skillId"> & {
    handle: string;
    sourceType: string;
  },
  now: Date
) =>
  db.insert(skillVersionsTable).values({
    approvedAt: now,
    createdAt: now,
    entryPath: "SKILL.md",
    location: input.location,
    objectKey: input.contentObjectKey,
    resolvedLocation: input.resolvedLocation,
    sha256: input.sha256,
    skillId: sql<number>`(
      select id from skills
      where source_type = ${input.sourceType} and handle = ${input.handle}
    )`,
    version: input.version,
  });

const insertResourceForVersionStatement = (
  db: Database,
  resource: StoredResourceObject,
  input: { skillId: number; version: string },
  now: Date
) =>
  db.insert(skillResourcesTable).values({
    createdAt: now,
    mediaType: resource.mediaType,
    objectKey: resource.objectKey,
    path: resource.path,
    sha256: resource.sha256,
    size: resource.size,
    skillVersionId: sql<number>`(
      select id from skill_versions
      where skill_id = ${input.skillId} and version = ${input.version}
    )`,
  });

const insertResourceForLocationStatement = (
  db: Database,
  resource: StoredResourceObject,
  input: { handle: string; sourceType: string; version: string },
  now: Date
) =>
  db.insert(skillResourcesTable).values({
    createdAt: now,
    mediaType: resource.mediaType,
    objectKey: resource.objectKey,
    path: resource.path,
    sha256: resource.sha256,
    size: resource.size,
    skillVersionId: sql<number>`(
      select skill_versions.id
      from skill_versions
      inner join skills on skills.id = skill_versions.skill_id
      where skills.source_type = ${input.sourceType}
        and skills.handle = ${input.handle}
        and skill_versions.version = ${input.version}
    )`,
  });

const approveVersionStatement = (
  db: Database,
  input: { description: string; skillId: number; versionName: string },
  now: Date
) =>
  db
    .update(skillsTable)
    .set({
      currentApprovedVersion: input.versionName,
      currentApprovedVersionId: sql<number>`(
        select id from skill_versions
        where skill_id = ${input.skillId} and version = ${input.versionName}
      )`,
      description: input.description,
      updatedAt: now,
    })
    .where(eq(skillsTable.id, input.skillId));

const writeSkillBatchByLocation = async (
  db: Database,
  statements: SkillBatch,
  sourceType: string,
  handle: string,
  versionName: string
) => {
  await db.batch(statements);

  const [skill] = await db
    .select()
    .from(skillsTable)
    .where(
      and(
        eq(skillsTable.sourceType, sourceType),
        eq(skillsTable.handle, handle)
      )
    )
    .limit(1);
  if (!skill) {
    throw new Error("Skill was not created");
  }

  const [version] = await db
    .select()
    .from(skillVersionsTable)
    .where(
      and(
        eq(skillVersionsTable.skillId, skill.id),
        eq(skillVersionsTable.version, versionName)
      )
    )
    .limit(1);
  if (!version) {
    throw new Error("Skill version was not created");
  }

  return { skill, version };
};

const writeSkillBatchById = async (
  db: Database,
  statements: SkillBatch,
  skillId: number,
  versionName: string
) => {
  await db.batch(statements);

  const [skill] = await db
    .select()
    .from(skillsTable)
    .where(eq(skillsTable.id, skillId))
    .limit(1);
  if (!skill) {
    throw new Error("Skill was not approved");
  }

  const [version] = await db
    .select()
    .from(skillVersionsTable)
    .where(
      and(
        eq(skillVersionsTable.skillId, skill.id),
        eq(skillVersionsTable.version, versionName)
      )
    )
    .limit(1);
  if (!version) {
    throw new Error("Skill version was not created");
  }

  return { skill, version };
};

export const insertSkillWithVersion = (
  db: Database,
  input: {
    contentObjectKey: string;
    description: string;
    handle: string;
    location: string;
    name: string;
    resources: StoredResourceObject[];
    resolvedLocation: string;
    sha256: string;
    sourceType: string;
    version: string;
  }
) => {
  const now = new Date();
  const statements: SkillBatch = [
    db.insert(skillsTable).values({
      createdAt: now,
      currentApprovedVersion: input.version,
      currentApprovedVersionId: 0,
      description: input.description,
      handle: input.handle,
      location: input.location,
      name: input.name,
      sourceType: input.sourceType,
      trustStatus: "approved",
      updatedAt: now,
    }),
    insertVersionForLocationStatement(
      db,
      {
        contentObjectKey: input.contentObjectKey,
        handle: input.handle,
        location: input.location,
        resolvedLocation: input.resolvedLocation,
        resources: input.resources,
        sha256: input.sha256,
        sourceType: input.sourceType,
        version: input.version,
      },
      now
    ),
    ...input.resources.map((resource) =>
      insertResourceForLocationStatement(
        db,
        resource,
        {
          handle: input.handle,
          sourceType: input.sourceType,
          version: input.version,
        },
        now
      )
    ),
    db
      .update(skillsTable)
      .set({
        currentApprovedVersionId: sql<number>`(
          select skill_versions.id
          from skill_versions
          inner join skills on skills.id = skill_versions.skill_id
          where skills.source_type = ${input.sourceType}
            and skills.handle = ${input.handle}
            and skill_versions.version = ${input.version}
        )`,
      })
      .where(
        and(
          eq(skillsTable.sourceType, input.sourceType),
          eq(skillsTable.handle, input.handle)
        )
      ),
  ];

  return writeSkillBatchByLocation(
    db,
    statements,
    input.sourceType,
    input.handle,
    input.version
  );
};

export const insertVersionForSkill = (
  db: Database,
  input: {
    contentObjectKey: string;
    description: string;
    location: string;
    resources: StoredResourceObject[];
    resolvedLocation: string;
    sha256: string;
    skillId: number;
    version: string;
  }
) => {
  const now = new Date();
  const statements: SkillBatch = [
    insertVersionStatement(
      db,
      {
        contentObjectKey: input.contentObjectKey,
        location: input.location,
        resolvedLocation: input.resolvedLocation,
        resources: input.resources,
        sha256: input.sha256,
        skillId: input.skillId,
        version: input.version,
      },
      now
    ),
    ...input.resources.map((resource) =>
      insertResourceForVersionStatement(
        db,
        resource,
        {
          skillId: input.skillId,
          version: input.version,
        },
        now
      )
    ),
    approveVersionStatement(
      db,
      {
        description: input.description,
        skillId: input.skillId,
        versionName: input.version,
      },
      now
    ),
  ];

  return writeSkillBatchById(db, statements, input.skillId, input.version);
};

export const deleteSkillById = async (db: Database, skillId: number) => {
  const versions = await db
    .select({ id: skillVersionsTable.id })
    .from(skillVersionsTable)
    .where(eq(skillVersionsTable.skillId, skillId))
    .all();
  const versionIds = versions.map((version) => version.id);

  if (versionIds.length > 0) {
    await db
      .delete(skillResourcesTable)
      .where(inArray(skillResourcesTable.skillVersionId, versionIds));
  }

  await db
    .delete(skillVersionsTable)
    .where(eq(skillVersionsTable.skillId, skillId));
  await db.delete(skillsTable).where(eq(skillsTable.id, skillId));
};
