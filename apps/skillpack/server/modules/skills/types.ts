import type {
  skillOriginsTable,
  skillResourcesTable,
  skillVersionsTable,
  skillsTable,
} from "@server/db/schema";
import type {
  CreateSkillInput,
  ForkSkillInput,
  PatchSkillInput,
  RestoreVersionInput,
} from "@skillpack/contracts/skills/requests";

export type SkillRow = typeof skillsTable.$inferSelect;
export type SkillVersionRow = typeof skillVersionsTable.$inferSelect;
export type SkillResourceRow = typeof skillResourcesTable.$inferSelect;
export type SkillOriginRow = typeof skillOriginsTable.$inferSelect;

export interface SkillWithCurrentVersion {
  origin?: SkillOriginRow | null;
  skill: SkillRow;
  version: SkillVersionRow;
}

export interface ResolvedSkillResult extends SkillWithCurrentVersion {
  content: string;
  resources: SkillResourceRow[];
}

export interface SkillFileResource {
  mediaType: string;
  path: string;
  sha256: string;
  size: number;
}

export interface ReadSkillFileInput {
  path: string;
  skillId: number;
  version?: number;
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
  path: string;
  sha256: string;
  size: number;
}

export interface TextResourceInput {
  content: string;
  mediaType?: string;
  path: string;
}

export interface PatchSkillResult {
  currentVersion: number;
  description: string;
  id: number;
  name: string;
}

export interface RestoreSkillVersionResult {
  currentVersion: number;
  id: number;
  restoredFromVersion: number;
}

export type ForkSkillResult =
  | {
      selection: ForkSkillInput["selections"][number];
      skill: ResolvedSkillResult;
      status: "forked";
    }
  | {
      error: string;
      selection: ForkSkillInput["selections"][number];
      status: "failed";
    };

export interface ForkSkillServiceResult {
  results: ForkSkillResult[];
}

export type CreateSkillServiceInput = CreateSkillInput;
export type ForkSkillServiceInput = ForkSkillInput;
export type PatchSkillServiceInput = PatchSkillInput;
export type RestoreVersionServiceInput = RestoreVersionInput;
