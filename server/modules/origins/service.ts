import type {
  DiscoverSkillsInput,
  OriginSelectionInput,
  SkillOriginInput,
} from "@shared/contract/origins/requests";

import { githubOriginAdapter } from "./adapters/github";
import { originErrors } from "./errors";
import type { OriginAdapter, OriginDefinitionResult } from "./types";

export class OriginService {
  private readonly adapters = new Map<SkillOriginInput["kind"], OriginAdapter>([
    [githubOriginAdapter.kind, githubOriginAdapter as OriginAdapter],
  ]);

  discoverSkills(input: DiscoverSkillsInput) {
    return this.getAdapter(input.origin.kind).discover(input.origin);
  }

  readSkillDefinitions(
    origin: SkillOriginInput,
    selections: OriginSelectionInput[]
  ): Promise<OriginDefinitionResult[]> {
    const adapter = this.adapters.get(origin.kind);

    if (adapter) {
      return adapter.readDefinitions(origin, selections);
    }

    return Promise.resolve(
      selections.map((selection) => ({
        error: originErrors.unsupportedOriginKind().message,
        selection,
        status: "failed" as const,
      }))
    );
  }

  private getAdapter(kind: SkillOriginInput["kind"]) {
    const adapter = this.adapters.get(kind);

    if (!adapter) {
      throw originErrors.unsupportedOriginKind();
    }

    return adapter;
  }
}
