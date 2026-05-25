import { skillContentPath } from "@server/constants";
import { parseFrontmatter } from "@server/shared/frontmatter";
import type { SkillOriginInput } from "@shared/contract/origins/requests";
import ky, { HTTPError } from "ky";

import { originErrors } from "../errors";
import type {
  OriginAdapter,
  OriginDefinitionResult,
  OriginDiscoveryResult,
  OriginSelection,
  OriginSkillDefinition,
} from "../types";

type GithubOrigin = Extract<SkillOriginInput, { kind: "github" }>;

interface GitHubTreeItem {
  path: string;
  type: string;
}

interface GitHubContentItem {
  name: string;
  path: string;
  type: "dir" | "file" | "submodule" | "symlink";
}

interface GitHubCommit {
  commit: {
    tree: {
      sha: string;
    };
  };
  sha: string;
}

interface GitHubOriginSnapshot {
  branch: string;
  owner: string;
  repo: string;
  repoUrl: string;
  rev: string;
}

interface GitHubSkillFile {
  name: string;
  path: string;
  prefix: string;
}

const wellKnownSkillRoots = [
  "skills",
  ".agents/skills",
  ".claude/skills",
  ".codex/skills",
] as const;

const githubApi = ky.create({
  headers: {
    accept: "application/vnd.github+json",
    "user-agent": "skillpack",
  },
  prefix: "https://api.github.com",
});

const githubRaw = ky.create({
  headers: { "user-agent": "skillpack" },
  prefix: "https://raw.githubusercontent.com",
});

const getSkillDescription = (content: string, fallback: string) => {
  const {
    data: { description },
  } = parseFrontmatter(content);

  if (typeof description === "string" && description.trim()) {
    return description.trim();
  }

  return fallback;
};

const parseGitHubRepoUrl = (repoUrl: string) => {
  const url = new URL(repoUrl);
  const [owner, repo] = url.pathname.replaceAll(/^\/|\.git$/gu, "").split("/");

  if (url.hostname !== "github.com" || !(owner && repo)) {
    throw originErrors.discoveryFailed("Valid GitHub repository URL required");
  }

  return { owner, repo };
};

const fetchGitHubJson = async <T>(path: string): Promise<T> => {
  try {
    return await githubApi.get(path).json<T>();
  } catch {
    throw originErrors.discoveryFailed("GitHub request failed");
  }
};

const fetchGitHubText = async (
  owner: string,
  repo: string,
  revision: string,
  path: string
) => {
  try {
    return await githubRaw.get(`${owner}/${repo}/${revision}/${path}`).text();
  } catch {
    throw originErrors.definitionFailed("GitHub raw file request failed");
  }
};

const loadOriginSnapshot = async (
  origin: GithubOrigin
): Promise<GitHubOriginSnapshot> => {
  const { owner, repo } = parseGitHubRepoUrl(origin.repoUrl);
  const repoInfo = await fetchGitHubJson<{ default_branch: string }>(
    `repos/${owner}/${repo}`
  );
  const branch = origin.branch ?? repoInfo.default_branch;
  const commit = await fetchGitHubJson<GitHubCommit>(
    `repos/${owner}/${repo}/commits/${encodeURIComponent(branch)}`
  );

  return {
    branch,
    owner,
    repo,
    repoUrl: origin.repoUrl,
    rev: commit.sha,
  };
};

const isGitHubNotFound = (error: unknown) =>
  error instanceof HTTPError && error.response.status === 404;

const readContentDirectory = async (
  snapshot: GitHubOriginSnapshot,
  path: string,
  errorKind: "definition" | "discovery"
) => {
  try {
    const content = await githubApi
      .get(`repos/${snapshot.owner}/${snapshot.repo}/contents/${path}`, {
        searchParams: { ref: snapshot.rev },
      })
      .json<GitHubContentItem | GitHubContentItem[]>();

    return Array.isArray(content) ? content : undefined;
  } catch (error) {
    if (isGitHubNotFound(error)) {
      return;
    }

    if (errorKind === "definition") {
      throw originErrors.definitionFailed("GitHub content request failed");
    }

    throw originErrors.discoveryFailed("GitHub content request failed");
  }
};

const discoverSkillFiles = async (snapshot: GitHubOriginSnapshot) => {
  const files: GitHubSkillFile[] = [];

  for (const root of wellKnownSkillRoots) {
    const rootItems = await readContentDirectory(snapshot, root, "discovery");

    if (!rootItems) {
      continue;
    }

    for (const rootItem of rootItems) {
      if (rootItem.type !== "dir") {
        continue;
      }

      const skillItems = await readContentDirectory(
        snapshot,
        rootItem.path,
        "discovery"
      );
      const skillFile = skillItems?.find(
        (item) => item.type === "file" && item.name === skillContentPath
      );

      if (!skillFile) {
        continue;
      }

      files.push({
        name: rootItem.name,
        path: skillFile.path,
        prefix: `${rootItem.path}/`,
      });
    }
  }

  return files;
};

const listSkillResources = async (
  snapshot: GitHubOriginSnapshot,
  skillPrefix: string,
  path = skillPrefix
): Promise<GitHubTreeItem[]> => {
  const items = await readContentDirectory(snapshot, path, "definition");
  const resources: GitHubTreeItem[] = [];

  for (const item of items ?? []) {
    if (item.type === "dir") {
      resources.push(
        ...(await listSkillResources(snapshot, skillPrefix, item.path))
      );
      continue;
    }

    if (item.type !== "file" || item.name === skillContentPath) {
      continue;
    }

    resources.push({
      path: item.path,
      type: "blob",
    });
  }

  return resources;
};

const findSkillFile = async (
  snapshot: GitHubOriginSnapshot,
  selection: OriginSelection,
  discoveredSkillFiles?: GitHubSkillFile[]
) => {
  const skillFiles =
    discoveredSkillFiles ?? (await discoverSkillFiles(snapshot));
  const skillFile = skillFiles.find(
    (file) => file.name === selection.skillName
  );

  if (!skillFile) {
    throw originErrors.definitionFailed("Skill file not found");
  }

  return skillFile;
};

const readResources = async (
  snapshot: GitHubOriginSnapshot,
  skillPrefix: string
) => {
  const resources = [];
  const resourceFiles = await listSkillResources(snapshot, skillPrefix);

  for (const item of resourceFiles) {
    resources.push({
      content: await fetchGitHubText(
        snapshot.owner,
        snapshot.repo,
        snapshot.rev,
        item.path
      ),
      path: item.path.slice(skillPrefix.length),
    });
  }

  return resources;
};

const readDefinition = async (
  snapshot: GitHubOriginSnapshot,
  selection: OriginSelection,
  skillFiles?: GitHubSkillFile[]
): Promise<OriginSkillDefinition> => {
  const skillFile = await findSkillFile(snapshot, selection, skillFiles);
  const content = await fetchGitHubText(
    snapshot.owner,
    snapshot.repo,
    snapshot.rev,
    skillFile.path
  );
  const description = getSkillDescription(
    content,
    `Forked from ${snapshot.repoUrl}`
  );

  return {
    content,
    description,
    name: skillFile.name,
    provenance: {
      kind: "github",
      metadata: {
        branch: snapshot.branch,
        resolvedSkillPath: skillFile.path,
        rev: snapshot.rev,
      },
      url: snapshot.repoUrl,
    },
    resources: await readResources(snapshot, skillFile.prefix),
    selection,
  };
};

export const githubOriginAdapter: OriginAdapter<GithubOrigin> = {
  kind: "github",

  async discover(origin: GithubOrigin): Promise<OriginDiscoveryResult> {
    const snapshot = await loadOriginSnapshot(origin);
    const skillFiles = await discoverSkillFiles(snapshot);

    return {
      candidates: skillFiles.map((file) => ({
        name: file.name,
        path: file.path,
        selection: { skillName: file.name },
      })),
      origin,
      resolvedOrigin: {
        branch: snapshot.branch,
        kind: "github",
        repoUrl: snapshot.repoUrl,
        rev: snapshot.rev,
      },
    };
  },

  async readDefinitions(
    origin: GithubOrigin,
    selections: OriginSelection[]
  ): Promise<OriginDefinitionResult[]> {
    let snapshot: GitHubOriginSnapshot;

    try {
      snapshot = await loadOriginSnapshot(origin);
    } catch (error) {
      return selections.map((selection) => ({
        error: error instanceof Error ? error.message : "Origin read failed",
        selection,
        status: "failed",
      }));
    }

    const results: OriginDefinitionResult[] = [];
    const skillFiles = await discoverSkillFiles(snapshot);

    for (const selection of selections) {
      try {
        results.push({
          definition: await readDefinition(snapshot, selection, skillFiles),
          status: "resolved",
        });
      } catch (error) {
        results.push({
          error: error instanceof Error ? error.message : "Skill read failed",
          selection,
          status: "failed",
        });
      }
    }

    return results;
  },
};
