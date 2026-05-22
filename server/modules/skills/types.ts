import type { skillResources, skillVersions, skills } from "@server/db/schema";
import type { CreateSkillInput } from "@shared/schemas/skills";

export type SkillRow = typeof skills.$inferSelect;
export type SkillVersionRow = typeof skillVersions.$inferSelect;
export type SkillResourceRow = typeof skillResources.$inferSelect;

export interface CreateSkillResult {
  description: string;
  name: string;
  version: string;
}

export interface ReadSkillResult {
  content: string;
  resources: SkillResourceRow[];
  skill: SkillRow;
  version: SkillVersionRow;
}

export interface SkillFileResource {
  mediaType: string;
  path: string;
  sha256: string;
  size: number;
}

export interface ReadSkillFileInput {
  name: string;
  path: string;
  version?: string;
}

export interface ReadSkillFileResult {
  object: R2ObjectBody;
  resource: SkillFileResource;
  version: SkillVersionRow;
}

export interface ReadSkillTextFileResult {
  content: string;
  resource: SkillFileResource;
  version: SkillVersionRow;
}

export interface StoredResourceObject {
  mediaType: string;
  objectKey: string;
  path: string;
  sha256: string;
  size: number;
}

export type CreateSkillServiceInput = CreateSkillInput;
