import type {
  skillResourcesTable,
  skillSnapshotsTable,
  skillsTable,
} from "@server/db/schema";
import type {
  CreateSkillInput,
  CreateSkillSnapshotInput,
  ForkSkillInput,
  PatchSkillInput,
} from "@skillpack/contracts/skills/requests";
import type { SkillOriginJson } from "@skillpack/contracts/skills/state";

export type SkillRow = typeof skillsTable.$inferSelect;
export type SkillResourceRow = typeof skillResourcesTable.$inferSelect;
export type SkillSnapshotRow = typeof skillSnapshotsTable.$inferSelect;
export type SkillOrigin = SkillOriginJson;

export interface SkillWithCurrentState {
  skill: SkillRow;
}

export interface ResolvedSkillResult extends SkillWithCurrentState {
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
}

export interface ReadSkillFileByNameInput {
  path: string;
  skillName: string;
}

export interface ReadSkillFileResult {
  object: R2ObjectBody;
  resource: SkillFileResource;
}

export interface ReadSkillTextFileResult {
  content: string;
  resource: SkillFileResource;
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
  allowedTools: string | null;
  compatibility: string | null;
  description: string;
  license: string | null;
  metadata: Record<string, string> | null;
  name: string;
}

export interface RestoreSkillSnapshotResult {
  name: string;
  restoredFromSnapshot: number;
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
export type CreateSkillSnapshotServiceInput = CreateSkillSnapshotInput;
export type ForkSkillServiceInput = ForkSkillInput;
export type PatchSkillServiceInput = PatchSkillInput;
