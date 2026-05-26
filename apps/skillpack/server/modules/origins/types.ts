import type {
  OriginSelectionInput,
  SkillOriginInput,
} from "@skillpack/contracts/origins/requests";
import type {
  OriginSkillCandidate,
  ResolvedSkillOrigin,
} from "@skillpack/contracts/origins/responses";

export type OriginSelection = OriginSelectionInput;
export type SkillOrigin = SkillOriginInput;

export interface OriginResourceDefinition {
  content: string;
  mediaType?: string;
  path: string;
}

export interface OriginProvenance {
  kind: "github";
  metadata: Record<string, unknown>;
  url: string;
}

export interface OriginSkillDefinition {
  allowedTools?: string | null;
  compatibility?: string | null;
  content: string;
  description: string;
  license?: string | null;
  metadata?: Record<string, string> | null;
  name: string;
  provenance: OriginProvenance;
  resources: OriginResourceDefinition[];
  selection: OriginSelection;
}

export type OriginDefinitionResult =
  | {
      definition: OriginSkillDefinition;
      status: "resolved";
    }
  | {
      error: string;
      selection: OriginSelection;
      status: "failed";
    };

export interface OriginDiscoveryResult {
  candidates: OriginSkillCandidate[];
  origin: SkillOrigin;
  resolvedOrigin: ResolvedSkillOrigin;
}

export interface OriginAdapter<TOrigin extends SkillOrigin = SkillOrigin> {
  discover(origin: TOrigin): Promise<OriginDiscoveryResult>;
  kind: TOrigin["kind"];
  readDefinitions(
    origin: TOrigin,
    selections: OriginSelection[]
  ): Promise<OriginDefinitionResult[]>;
}
