import { skillContentPath } from "@server/constants";
import { parseFrontmatter } from "@server/shared/frontmatter";
import type { SkillOriginInput } from "@shared/contract/origins/requests";
import ky from "ky";

import { originErrors } from "../errors";
import type {
  OriginDefinitionResult,
  OriginDiscoveryResult,
  OriginSelection,
  OriginSkillDefinition,
} from "../types";

type GithubOrigin = Extract<SkillOriginInput, { kind: "github" }>;

interface GitHubRepository {
  default_branch: string;
}

interface GitHubCommit {
  commit: {
    tree: {
      sha: string;
    };
  };
  sha: string;
}

interface GitHubTreeResponse {
  tree: GitHubTreeEntry[];
}

export interface GitHubTreeEntry {
  path: string;
  sha: string;
  type: "blob" | "tree";
}

interface GitHubOriginSnapshot {
  branch: string;
  owner: string;
  repo: string;
  repoUrl: string;
  rev: string;
  tree: GitHubTreeEntry[];
}

interface GitHubSkillFile {
  name: string;
  path: string;
  prefix: string;
}

export interface GitHubTransport {
  getCommit(owner: string, repo: string, branch: string): Promise<GitHubCommit>;
  getRepository(owner: string, repo: string): Promise<GitHubRepository>;
  getTree(
    owner: string,
    repo: string,
    treeSha: string
  ): Promise<GitHubTreeResponse>;
  getRawText(
    owner: string,
    repo: string,
    revision: string,
    path: string
  ): Promise<string>;
}

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

export const githubTransport: GitHubTransport = {
  getCommit: (owner, repo, branch) =>
    githubApi
      .get(`repos/${owner}/${repo}/commits/${encodeURIComponent(branch)}`)
      .json<GitHubCommit>(),
  getRawText: (owner, repo, revision, path) =>
    githubRaw.get(`${owner}/${repo}/${revision}/${path}`).text(),
  getRepository: (owner, repo) =>
    githubApi.get(`repos/${owner}/${repo}`).json<GitHubRepository>(),
  getTree: (owner, repo, treeSha) =>
    githubApi
      .get(`repos/${owner}/${repo}/git/trees/${treeSha}`, {
        searchParams: { recursive: "1" },
      })
      .json<GitHubTreeResponse>(),
};

const priorityPrefixes = [
  "",
  "skills/",
  "skills/.curated/",
  "skills/.experimental/",
  "skills/.system/",
  ".agents/skills/",
  ".claude/skills/",
  ".codex/skills/",
] as const;

const allowedTextResourceExtensions = new Set([
  ".md",
  ".txt",
  ".json",
  ".js",
  ".mjs",
  ".ts",
  ".py",
  ".sh",
]);

const maxFallbackSkillPathDepth = 6;

const isSkillFilePath = (path: string) =>
  path.toLowerCase().endsWith(`/${skillContentPath.toLowerCase()}`) ||
  path.toLowerCase() === skillContentPath.toLowerCase();

const parseGitHubRepoUrl = (repoUrl: string) => {
  const url = new URL(repoUrl);
  const [owner, repo] = url.pathname.replaceAll(/^\/|\.git$/gu, "").split("/");

  if (url.hostname !== "github.com" || !(owner && repo)) {
    throw originErrors.discoveryFailed("Valid GitHub repository URL required");
  }

  return { owner, repo };
};

const isSafeRelativePath = (path: string) =>
  !path.startsWith("/") &&
  !path.includes("\\") &&
  path.split("/").every((part) => part && part !== "." && part !== "..");

const getDirectoryPrefix = (skillPath: string) => {
  const index = skillPath.lastIndexOf("/");
  return index === -1 ? "" : `${skillPath.slice(0, index)}/`;
};

const getCandidateName = (repo: string, skillPath: string) => {
  const prefix = getDirectoryPrefix(skillPath);

  if (!prefix) {
    return repo;
  }

  const parts = prefix.slice(0, -1).split("/");
  return parts.at(-1) ?? repo;
};

const getExtension = (path: string) => {
  const fileName = path.split("/").at(-1) ?? "";
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex <= 0) {
    return;
  }

  return fileName.slice(dotIndex).toLowerCase();
};

const assertTextResourcePath = (path: string) => {
  const extension = getExtension(path);

  if (!(extension && allowedTextResourceExtensions.has(extension))) {
    throw originErrors.definitionFailed(`Unsupported resource type: ${path}`);
  }
};

const assertSafeResourcePath = (path: string) => {
  if (!isSafeRelativePath(path)) {
    throw originErrors.definitionFailed(`Unsafe resource path: ${path}`);
  }
};

const discoverPrioritySkillPaths = (tree: GitHubTreeEntry[]) => {
  const skillPaths = tree
    .filter((entry) => entry.type === "blob" && isSkillFilePath(entry.path))
    .map((entry) => entry.path);
  const discovered: string[] = [];
  const seenPaths = new Set<string>();

  for (const prefix of priorityPrefixes) {
    for (const path of skillPaths) {
      if (!path.startsWith(prefix)) {
        continue;
      }

      const rest = path.slice(prefix.length);
      const parts = rest.split("/");
      const isDirectRootSkill =
        prefix === "" && rest.toLowerCase() === "skill.md";
      const isOneLevelSkill =
        prefix !== "" &&
        parts.length === 2 &&
        parts.at(-1)?.toLowerCase() === "skill.md";

      if ((isDirectRootSkill || isOneLevelSkill) && !seenPaths.has(path)) {
        discovered.push(path);
        seenPaths.add(path);
      }
    }
  }

  return discovered;
};

const discoverFallbackSkillPaths = (tree: GitHubTreeEntry[]) =>
  tree
    .filter(
      (entry) =>
        entry.type === "blob" &&
        isSkillFilePath(entry.path) &&
        entry.path.split("/").length <= maxFallbackSkillPathDepth
    )
    .map((entry) => entry.path);

const discoverSkillFiles = (snapshot: GitHubOriginSnapshot) => {
  const priorityPaths = discoverPrioritySkillPaths(snapshot.tree);
  const skillPaths =
    priorityPaths.length > 0
      ? priorityPaths
      : discoverFallbackSkillPaths(snapshot.tree);
  const byName = new Map<string, GitHubSkillFile>();

  for (const path of skillPaths) {
    if (!isSafeRelativePath(path)) {
      continue;
    }

    const name = getCandidateName(snapshot.repo, path);

    if (!byName.has(name)) {
      byName.set(name, {
        name,
        path,
        prefix: getDirectoryPrefix(path),
      });
    }
  }

  return [...byName.values()];
};

const parseSkillMetadata = (content: string) => {
  const { data } = parseFrontmatter(content);
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const description =
    typeof data.description === "string" ? data.description.trim() : "";

  if (!(name && description)) {
    throw originErrors.definitionFailed(
      "Skill frontmatter must include name and description"
    );
  }

  return { description, name };
};

const findSkillFile = (
  snapshot: GitHubOriginSnapshot,
  selection: OriginSelection,
  discoveredSkillFiles: GitHubSkillFile[]
) => {
  const skillFile = discoveredSkillFiles.find(
    (file) => file.name === selection.skillName
  );

  if (!skillFile) {
    throw originErrors.definitionFailed("Skill file not found");
  }

  return skillFile;
};

const readRawText = async (
  transport: GitHubTransport,
  snapshot: GitHubOriginSnapshot,
  path: string
) => {
  try {
    return await transport.getRawText(
      snapshot.owner,
      snapshot.repo,
      snapshot.rev,
      path
    );
  } catch {
    throw originErrors.definitionFailed("GitHub raw file request failed");
  }
};

const readResources = async (
  transport: GitHubTransport,
  snapshot: GitHubOriginSnapshot,
  skillPath: string,
  skillPrefix: string
) => {
  const resources = [];

  for (const entry of snapshot.tree) {
    if (entry.type !== "blob" || !entry.path.startsWith(skillPrefix)) {
      continue;
    }

    const path = entry.path.slice(skillPrefix.length);

    if (entry.path === skillPath) {
      continue;
    }

    assertSafeResourcePath(path);
    assertTextResourcePath(path);

    resources.push({
      content: await readRawText(transport, snapshot, entry.path),
      path,
    });
  }

  return resources;
};

const loadOriginSnapshot = async (
  transport: GitHubTransport,
  origin: GithubOrigin
): Promise<GitHubOriginSnapshot> => {
  try {
    const { owner, repo } = parseGitHubRepoUrl(origin.repoUrl);
    const repoInfo = await transport.getRepository(owner, repo);
    const branch = origin.branch ?? repoInfo.default_branch;
    const commit = await transport.getCommit(owner, repo, branch);
    const tree = await transport.getTree(owner, repo, commit.commit.tree.sha);

    return {
      branch,
      owner,
      repo,
      repoUrl: origin.repoUrl,
      rev: commit.sha,
      tree: tree.tree,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "OriginModuleError") {
      throw error;
    }

    throw originErrors.discoveryFailed("GitHub request failed");
  }
};

const readDefinition = async (
  transport: GitHubTransport,
  snapshot: GitHubOriginSnapshot,
  selection: OriginSelection,
  skillFiles: GitHubSkillFile[]
): Promise<OriginSkillDefinition> => {
  const skillFile = findSkillFile(snapshot, selection, skillFiles);
  const content = await readRawText(transport, snapshot, skillFile.path);
  const { description, name } = parseSkillMetadata(content);

  return {
    content,
    description,
    name,
    provenance: {
      kind: "github",
      metadata: {
        branch: snapshot.branch,
        resolvedSkillPath: skillFile.path,
        rev: snapshot.rev,
      },
      url: snapshot.repoUrl,
    },
    resources: await readResources(
      transport,
      snapshot,
      skillFile.path,
      skillFile.prefix
    ),
    selection,
  };
};

export const createGitHubRetrieval = (transport: GitHubTransport) => ({
  async discover(origin: GithubOrigin): Promise<OriginDiscoveryResult> {
    const snapshot = await loadOriginSnapshot(transport, origin);
    const skillFiles = discoverSkillFiles(snapshot);

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
      snapshot = await loadOriginSnapshot(transport, origin);
    } catch (error) {
      return selections.map((selection) => ({
        error: error instanceof Error ? error.message : "Origin read failed",
        selection,
        status: "failed",
      }));
    }

    const skillFiles = discoverSkillFiles(snapshot);
    const results: OriginDefinitionResult[] = [];

    for (const selection of selections) {
      try {
        results.push({
          definition: await readDefinition(
            transport,
            snapshot,
            selection,
            skillFiles
          ),
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
});
