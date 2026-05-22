import { skillErrors } from "./errors";
import {
  deleteSkillById,
  findResourceByPath,
  findSkillByName,
  findSkillVersion,
  insertSkillWithVersion,
  listResourcesByVersionId,
  listSkills,
  listSkillVersions,
} from "./repository";
import {
  deleteSkillObjects,
  getSkillObject,
  markdownMediaType,
  putSkillContent,
  putSkillResource,
  skillEntryPath,
} from "./storage";
import type {
  CreateSkillResult,
  CreateSkillServiceInput,
  ReadSkillFileInput,
  ReadSkillFileResult,
  ReadSkillResult,
  ReadSkillTextFileResult,
  StoredResourceObject,
} from "./types";

const readSkillAndVersion = async (
  database: D1Database,
  name: string,
  requestedVersion?: string
) => {
  const skill = await findSkillByName(database, name);

  if (!skill) {
    throw skillErrors.skillNotFound();
  }

  const versionName = requestedVersion ?? skill.latestVersion;
  const version = await findSkillVersion(database, skill.id, versionName);

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

  if (resourcePaths.has(skillEntryPath)) {
    throw skillErrors.reservedResourcePath();
  }
};

export const listSkillCatalog = (database: D1Database) => listSkills(database);

export const listSkillVersionHistory = async (
  database: D1Database,
  name: string
) => {
  const skill = await findSkillByName(database, name);

  if (!skill) {
    throw skillErrors.skillNotFound();
  }

  const versions = await listSkillVersions(database, skill.id);
  return { skill, versions };
};

export const readSkill = async (
  database: D1Database,
  bucket: R2Bucket,
  name: string,
  requestedVersion?: string
): Promise<ReadSkillResult> => {
  const { skill, version } = await readSkillAndVersion(
    database,
    name,
    requestedVersion
  );
  const object = await getSkillObject(bucket, version.objectKey);

  if (!object) {
    throw skillErrors.skillObjectNotFound();
  }

  const resources = await listResourcesByVersionId(database, version.id);

  return {
    content: await object.text(),
    resources,
    skill,
    version,
  };
};

export const readSkillFile = async (
  database: D1Database,
  bucket: R2Bucket,
  input: ReadSkillFileInput
): Promise<ReadSkillFileResult> => {
  const { version } = await readSkillAndVersion(
    database,
    input.name,
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

  const resource = await findResourceByPath(database, version.id, input.path);

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
  database: D1Database,
  bucket: R2Bucket,
  input: ReadSkillFileInput
): Promise<ReadSkillTextFileResult> => {
  const result = await readSkillFile(database, bucket, input);

  return {
    content: await result.object.text(),
    resource: result.resource,
    version: result.version,
  };
};

export const createSkill = async (
  database: D1Database,
  bucket: R2Bucket,
  input: CreateSkillServiceInput
): Promise<CreateSkillResult> => {
  const existing = await findSkillByName(database, input.name);

  if (existing) {
    throw skillErrors.duplicateSkillName();
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

  const created = await insertSkillWithVersion(database, {
    contentObjectKey: contentObject.objectKey,
    description: input.description,
    name: input.name,
    resources: resourceObjects,
    sha256: contentObject.sha256,
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
    name: input.name,
    version: input.version,
  };
};

export const deleteSkill = async (
  database: D1Database,
  bucket: R2Bucket,
  name: string
) => {
  const skill = await findSkillByName(database, name);

  if (!skill) {
    throw skillErrors.skillNotFound();
  }

  await deleteSkillById(database, skill.id);
  await deleteSkillObjects(bucket, skill.name);
};
