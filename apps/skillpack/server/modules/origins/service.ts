import type {
  DiscoverSkillsInput,
  OriginSelectionInput,
  SkillOriginInput,
} from "@skillpack/contracts/origins/requests";

import { createGithubOriginAdapter } from "./adapters/github";
import { originErrors } from "./errors";
import type { OriginAdapter, OriginDefinitionResult } from "./types";

interface OriginServiceOptions {
  githubClientId?: string;
  githubClientSecret?: string;
}

export class OriginService {
  private readonly adapters: Map<SkillOriginInput["kind"], OriginAdapter>;

  constructor(options: OriginServiceOptions = {}) {
    const githubOriginAdapter = createGithubOriginAdapter({
      githubClientId: options.githubClientId,
      githubClientSecret: options.githubClientSecret,
    });

    this.adapters = new Map<SkillOriginInput["kind"], OriginAdapter>([
      [githubOriginAdapter.kind, githubOriginAdapter as OriginAdapter],
    ]);
  }

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
