import type {
  skillResourcesTable,
  skillVersionsTable,
  skillsTable,
} from "@server/db/schema";
import type { CreateSkillInput, SkillSourceType } from "@shared/schemas/skills";

export type SkillRow = typeof skillsTable.$inferSelect;
export type SkillVersionRow = typeof skillVersionsTable.$inferSelect;
export type SkillResourceRow = typeof skillResourcesTable.$inferSelect;

export interface CreateSkillResult {
  description: string;
  handle: string;
  location: string;
  name: string;
  trust: SkillTrustResult;
  version: string;
}

export interface SkillLocationInput {
  handle: string;
  sourceType: SkillSourceType;
}

export interface SkillTrustResult {
  approvedAt: Date;
  status: "approved";
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
  location: SkillLocationInput;
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
