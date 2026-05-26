import type { SkillOriginInput } from "@shared/contract/origins/requests";

import type { OriginAdapter } from "../types";
import { createGitHubRetrieval, githubTransport } from "./github-retrieval";
import type { GitHubTransport } from "./github-retrieval";

type GithubOrigin = Extract<SkillOriginInput, { kind: "github" }>;

export const createGithubOriginAdapter = (
  transport: GitHubTransport = githubTransport
): OriginAdapter<GithubOrigin> => {
  const retrieval = createGitHubRetrieval(transport);

  return {
    discover: retrieval.discover,
    kind: "github",
    readDefinitions: retrieval.readDefinitions,
  };
};

export const githubOriginAdapter = createGithubOriginAdapter();
