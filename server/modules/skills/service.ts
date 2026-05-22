import type { Database } from "@server/types";

import { skillErrors } from "./errors";
import {
  buildSkillpackLocation,
  buildSkillpackResolvedLocation,
  skillContentPath,
  skillpackSourceType,
} from "./location";
import {
  deleteSkillById,
  findResourceByPath,
  findSkillByLocation,
  findSkillVersion,
  insertSkillWithVersion,
  insertVersionForSkill,
  listResourcesByVersionId,
  listSkills as listStoredSkills,
  listSkillVersions,
} from "./repository";
import {
  deleteSkillObjects,
  getSkillObject,
  markdownMediaType,
  putSkillContent,
  putSkillResource,
} from "./storage";
import type {
  CreateSkillResult,
  CreateSkillServiceInput,
  ReadSkillFileInput,
  ReadSkillFileResult,
  ReadSkillResult,
  ReadSkillTextFileResult,
  SkillLocationInput,
  StoredResourceObject,
} from "./types";

const readSkillAndVersion = async (
  db: Database,
  location: SkillLocationInput,
  requestedVersion?: string
) => {
  const skill = await findSkillByLocation(
    db,
    location.sourceType,
    location.handle
  );

  if (!skill) {
    throw skillErrors.skillNotFound();
  }

  const versionName = requestedVersion ?? skill.currentApprovedVersion;
  const version = await findSkillVersion(db, skill.id, versionName);

  if (!version) {
    throw skillErrors.skillVersionNotFound();
  }

  return { skill, version };
};

const validateResourcePaths = (input: CreateSkillServiceInput) => {
  const resourcePaths = new Set(
    input.resources.map((resource) => resource.path)
  );

  if (resourcePaths.size !== input.resources.length) {
    throw skillErrors.duplicateResourcePath();
  }

  if (resourcePaths.has(skillContentPath)) {
    throw skillErrors.reservedResourcePath();
  }
};

export const listSkills = (db: Database) => listStoredSkills(db);

export const listSkillVersionsForSkill = async (
  db: Database,
  location: SkillLocationInput
) => {
  const skill = await findSkillByLocation(
    db,
    location.sourceType,
    location.handle
  );

  if (!skill) {
    throw skillErrors.skillNotFound();
  }

  const versions = await listSkillVersions(db, skill.id);
  return { skill, versions };
};

export const resolveSkill = async (
  db: Database,
  bucket: R2Bucket,
  location: SkillLocationInput,
  requestedVersion?: string
): Promise<ReadSkillResult> => {
  const { skill, version } = await readSkillAndVersion(
    db,
    location,
    requestedVersion
  );
  const object = await getSkillObject(bucket, version.objectKey);

  if (!object) {
    throw skillErrors.skillObjectNotFound();
  }

  const resources = await listResourcesByVersionId(db, version.id);

  return {
    content: await object.text(),
    resources,
    skill,
    version,
  };
};

export const readSkillResource = async (
  db: Database,
  bucket: R2Bucket,
  input: ReadSkillFileInput
): Promise<ReadSkillFileResult> => {
  const { version } = await readSkillAndVersion(
    db,
    input.location,
    input.version
  );

  if (input.path === version.entryPath) {
    const object = await getSkillObject(bucket, version.objectKey);

    if (!object) {
      throw skillErrors.skillObjectNotFound();
    }

    return {
      object,
      resource: {
        mediaType: markdownMediaType,
        path: version.entryPath,
        sha256: version.sha256,
        size: object.size,
      },
      version,
    };
  }

  const resource = await findResourceByPath(db, version.id, input.path);

  if (!resource) {
    throw skillErrors.skillFileNotFound();
  }

  const object = await getSkillObject(bucket, resource.objectKey);

  if (!object) {
    throw skillErrors.skillObjectNotFound();
  }

  return { object, resource, version };
};

export const readSkillTextFile = async (
  db: Database,
  bucket: R2Bucket,
  input: ReadSkillFileInput
): Promise<ReadSkillTextFileResult> => {
  const result = await readSkillResource(db, bucket, input);

  return {
    content: await result.object.text(),
    resource: result.resource,
    version: result.version,
  };
};

export const createSkillpackSkill = async (
  db: Database,
  bucket: R2Bucket,
  input: CreateSkillServiceInput
): Promise<CreateSkillResult> => {
  const location = buildSkillpackLocation(input.name);
  const resolvedLocation = buildSkillpackResolvedLocation(
    input.name,
    input.version
  );
  const existing = await findSkillByLocation(
    db,
    skillpackSourceType,
    input.name
  );

  const existingVersion = existing
    ? await findSkillVersion(db, existing.id, input.version)
    : undefined;

  if (existingVersion) {
    throw skillErrors.duplicateSkillVersion();
  }

  validateResourcePaths(input);

  const contentObject = await putSkillContent(
    bucket,
    input.name,
    input.version,
    input.content
  );
  const resourceObjects: StoredResourceObject[] = [];

  for (const resource of input.resources) {
    resourceObjects.push(
      await putSkillResource(bucket, input.name, input.version, resource)
    );
  }

  const created = existing
    ? await insertVersionForSkill(db, {
        contentObjectKey: contentObject.objectKey,
        description: input.description,
        location,
        resolvedLocation,
        resources: resourceObjects,
        sha256: contentObject.sha256,
        skillId: existing.id,
        version: input.version,
      })
    : await insertSkillWithVersion(db, {
        contentObjectKey: contentObject.objectKey,
        description: input.description,
        handle: input.name,
        location,
        name: input.name,
        resolvedLocation,
        resources: resourceObjects,
        sha256: contentObject.sha256,
        sourceType: skillpackSourceType,
        version: input.version,
      });

  if (!created?.skill) {
    throw skillErrors.skillCreationFailed("Skill was not created");
  }

  if (!created.version) {
    throw skillErrors.skillCreationFailed("Skill version was not created");
  }

  return {
    description: input.description,
    handle: input.name,
    location,
    name: input.name,
    trust: {
      approvedAt: created.version.approvedAt,
      status: "approved",
    },
    version: input.version,
  };
};

export const deleteSkill = async (
  db: Database,
  bucket: R2Bucket,
  location: SkillLocationInput
) => {
  const skill = await findSkillByLocation(
    db,
    location.sourceType,
    location.handle
  );

  if (!skill) {
    throw skillErrors.skillNotFound();
  }

  await deleteSkillById(db, skill.id);
  await deleteSkillObjects(bucket, skill.handle);
};
