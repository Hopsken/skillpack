import { skillErrors } from "./errors";
import type { SkillRepository } from "./repository";
import { markdownMediaType, skillContentPath } from "./storage";
import type { SkillStorage } from "./storage";
import type {
  CreateSkillServiceInput,
  ForkSkillServiceInput,
  PatchSkillResult,
  PatchSkillServiceInput,
  ReadSkillFileInput,
  ReadSkillFileResult,
  ReadSkillTextFileResult,
  ResolvedSkillResult,
  RestoreSkillVersionResult,
  RestoreVersionServiceInput,
  SkillResourceRow,
  StoredResourceObject,
  TextResourceInput,
} from "./types";

interface GitHubTreeItem {
  path: string;
  type: string;
  url: string;
}

interface GitHubCommit {
  commit: {
    tree: {
      sha: string;
    };
  };
  sha: string;
}

const frontmatterDescriptionPattern =
  /^---\s*\n(?<frontmatter>[\s\S]*?)\n---\s*/u;
const descriptionPattern =
  /^description:\s*["']?(?<description>.+?)["']?\s*$/mu;

const getSkillDescription = (content: string, fallback: string) => {
  const frontmatter =
    frontmatterDescriptionPattern.exec(content)?.groups?.frontmatter;

  if (!frontmatter) {
    return fallback;
  }

  return (
    descriptionPattern.exec(frontmatter)?.groups?.description?.trim() ??
    fallback
  );
};

const parseGitHubRepoUrl = (repoUrl: string) => {
  const url = new URL(repoUrl);
  const [owner, repo] = url.pathname.replaceAll(/^\/|\.git$/gu, "").split("/");

  if (url.hostname !== "github.com" || !(owner && repo)) {
    throw skillErrors.invalidSkillLocator();
  }

  return { owner, repo };
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "skillpack",
    },
  });

  if (!response.ok) {
    throw skillErrors.skillCreationFailed("GitHub request failed");
  }

  return response.json<T>();
};

const fetchText = async (url: string) => {
  const response = await fetch(url, {
    headers: { "user-agent": "skillpack" },
  });

  if (!response.ok) {
    throw skillErrors.skillCreationFailed("GitHub raw file request failed");
  }

  return response.text();
};

const getGithubRawUrl = (
  owner: string,
  repo: string,
  revision: string,
  path: string
) => `https://raw.githubusercontent.com/${owner}/${repo}/${revision}/${path}`;

const getGithubSkillPrefix = (tree: GitHubTreeItem[], skillName: string) => {
  const skillFile = tree.find((item) => {
    const parts = item.path.split("/");
    return (
      item.type === "blob" &&
      item.path.endsWith(`/${skillContentPath}`) &&
      parts.at(-2) === skillName
    );
  });

  if (!skillFile) {
    throw skillErrors.skillFileNotFound();
  }

  return skillFile.path.slice(0, -skillContentPath.length);
};

const forkResourcesFromGithub = async (
  owner: string,
  repo: string,
  revision: string,
  skillPrefix: string,
  tree: GitHubTreeItem[]
) => {
  const resources: TextResourceInput[] = [];

  for (const item of tree) {
    if (
      item.type !== "blob" ||
      !item.path.startsWith(skillPrefix) ||
      item.path.endsWith(`/${skillContentPath}`)
    ) {
      continue;
    }

    const path = item.path.slice(skillPrefix.length);
    resources.push({
      content: await fetchText(
        getGithubRawUrl(owner, repo, revision, item.path)
      ),
      path,
    });
  }

  return resources;
};

const validateResourcePaths = (resources: TextResourceInput[]) => {
  const resourcePaths = new Set(resources.map((resource) => resource.path));

  if (resourcePaths.size !== resources.length) {
    throw skillErrors.duplicateResourcePath();
  }

  if (resourcePaths.has(skillContentPath)) {
    throw skillErrors.reservedResourcePath();
  }
};

const toStoredResource = (
  resource: SkillResourceRow
): StoredResourceObject => ({
  mediaType: resource.mediaType,
  path: resource.path,
  sha256: resource.sha256,
  size: resource.size,
});

const toStoredResources = (
  resources: SkillResourceRow[]
): StoredResourceObject[] =>
  resources.map((resource) => toStoredResource(resource));

export class SkillService {
  private readonly repository: SkillRepository;

  private readonly storage: SkillStorage;

  constructor(repository: SkillRepository, storage: SkillStorage) {
    this.repository = repository;
    this.storage = storage;
  }

  listSkills() {
    return this.repository.listSkills();
  }

  async listSkillVersionsForSkill(skillId: number) {
    const skill = await this.repository.findSkillById(skillId);

    if (!skill) {
      throw skillErrors.skillNotFound();
    }

    if (!skill.currentVersionId) {
      throw skillErrors.skillVersionNotFound();
    }

    const currentVersion = await this.repository.findCurrentSkillVersion(
      skill.currentVersionId
    );

    if (!currentVersion) {
      throw skillErrors.skillVersionNotFound();
    }

    const versions = await this.repository.listSkillVersions(skill.id);
    return { currentVersion, skill, versions };
  }

  async resolveSkill(
    skillId: number,
    requestedVersion?: number
  ): Promise<ResolvedSkillResult> {
    const { origin, skill, version } = await this.readSkillVersion(
      skillId,
      requestedVersion
    );
    const resources = await this.repository.listResourcesByVersionId(
      version.id
    );
    const content = await this.readContentResource(resources);

    return {
      content,
      origin,
      resources: resources.filter(
        (resource) => resource.path !== skillContentPath
      ),
      skill,
      version,
    };
  }

  async readSkillResource(
    input: ReadSkillFileInput
  ): Promise<ReadSkillFileResult> {
    const { version } = await this.readSkillVersion(
      input.skillId,
      input.version
    );
    const resource = await this.repository.findResourceByPath(
      version.id,
      input.path
    );

    if (!resource) {
      throw skillErrors.skillFileNotFound();
    }

    const object = await this.storage.getSkillObject(resource.sha256);

    if (!object) {
      throw skillErrors.skillObjectNotFound();
    }

    return { object, resource, version };
  }

  async readSkillTextFile(
    input: ReadSkillFileInput
  ): Promise<ReadSkillTextFileResult> {
    const result = await this.readSkillResource(input);

    return {
      content: await result.object.text(),
      resource: result.resource,
      version: result.version,
    };
  }

  async createSkill(input: CreateSkillServiceInput) {
    const now = new Date();
    const skill = await this.repository.insertSkill(input.name, now);
    const resources = await this.storeResourceSnapshot(
      input.content,
      input.resources
    );
    const version = await this.createVersionSnapshot(
      {
        changeSummary: input.changeSummary,
        description: input.description,
        label: input.versionLabel,
        resources,
        skillId: skill.id,
        versionNumber: 1,
      },
      now
    );

    await this.repository.updateSkillCurrentVersion({
      currentVersionId: version.id,
      skillId: skill.id,
      updatedAt: now,
    });

    return this.resolveSkill(skill.id);
  }

  async patchSkill(
    skillId: number,
    input: PatchSkillServiceInput
  ): Promise<PatchSkillResult> {
    const { skill, version } = await this.readSkillVersion(skillId);
    const currentResources = await this.repository.listResourcesByVersionId(
      version.id
    );
    const resources = await this.applyResourcePatch(currentResources, input);
    const now = new Date();
    const versionNumber =
      (await this.repository.findLatestVersionNumber(skill.id)) + 1;
    const nextDescription = input.description ?? version.description;
    const nextName = input.name ?? skill.name;
    const nextVersion = await this.createVersionSnapshot(
      {
        changeSummary: input.changeSummary,
        description: nextDescription,
        label: input.versionLabel,
        resources,
        skillId: skill.id,
        versionNumber,
      },
      now
    );

    await this.repository.updateSkillCurrentVersion({
      currentVersionId: nextVersion.id,
      name: nextName,
      skillId: skill.id,
      updatedAt: now,
    });

    return {
      currentVersion: versionNumber,
      description: nextDescription,
      id: skill.id,
      name: nextName,
    };
  }

  async restoreSkillVersion(
    skillId: number,
    versionNumber: number,
    input: RestoreVersionServiceInput
  ): Promise<RestoreSkillVersionResult> {
    const { skill, version } = await this.readSkillVersion(
      skillId,
      versionNumber
    );
    const sourceResources = await this.repository.listResourcesByVersionId(
      version.id
    );
    const now = new Date();
    const nextVersionNumber =
      (await this.repository.findLatestVersionNumber(skill.id)) + 1;
    const nextVersion = await this.createVersionSnapshot(
      {
        changeSummary: input.changeSummary,
        description: version.description,
        label: input.versionLabel,
        resources: toStoredResources(sourceResources),
        skillId: skill.id,
        versionNumber: nextVersionNumber,
      },
      now
    );

    await this.repository.updateSkillCurrentVersion({
      currentVersionId: nextVersion.id,
      skillId: skill.id,
      updatedAt: now,
    });

    return {
      currentVersion: nextVersionNumber,
      id: skill.id,
      restoredFromVersion: versionNumber,
    };
  }

  async deleteSkill(skillId: number) {
    const skill = await this.repository.findSkillById(skillId);

    if (!skill) {
      throw skillErrors.skillNotFound();
    }

    await this.repository.deleteSkillById(skill.id);
  }

  async forkSkill(input: ForkSkillServiceInput) {
    const { owner, repo } = parseGitHubRepoUrl(input.repoUrl);
    const repoInfo = await fetchJson<{ default_branch: string }>(
      `https://api.github.com/repos/${owner}/${repo}`
    );
    const branch = input.branch ?? repoInfo.default_branch;
    const commit = await fetchJson<GitHubCommit>(
      `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(branch)}`
    );
    const treeInfo = await fetchJson<{ sha: string; tree: GitHubTreeItem[] }>(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${commit.commit.tree.sha}?recursive=1`
    );
    const skillPrefix = getGithubSkillPrefix(treeInfo.tree, input.skillName);
    const content = await fetchText(
      getGithubRawUrl(
        owner,
        repo,
        commit.sha,
        `${skillPrefix}${skillContentPath}`
      )
    );
    const description = getSkillDescription(
      content,
      `Forked from ${input.repoUrl}`
    );
    const resources = await forkResourcesFromGithub(
      owner,
      repo,
      commit.sha,
      skillPrefix,
      treeInfo.tree
    );
    const created = await this.createSkill({
      content,
      description,
      name: input.skillName,
      resources,
      versionLabel: input.versionLabel,
    });
    const now = new Date();

    await this.repository.insertSkillOrigin(
      {
        kind: "github",
        metadata: {
          branch,
          resolvedSkillPath: `${skillPrefix}${skillContentPath}`,
          rev: commit.sha,
        },
        skillId: created.skill.id,
        url: input.repoUrl,
      },
      now
    );

    return this.resolveSkill(created.skill.id);
  }

  private async readSkillVersion(skillId: number, requestedVersion?: number) {
    const skill = await this.repository.findSkillById(skillId);

    if (!skill) {
      throw skillErrors.skillNotFound();
    }

    let version;

    if (requestedVersion) {
      version = await this.repository.findSkillVersionByNumber(
        skill.id,
        requestedVersion
      );
    } else if (skill.currentVersionId) {
      version = await this.repository.findCurrentSkillVersion(
        skill.currentVersionId
      );
    }

    if (!version) {
      throw skillErrors.skillVersionNotFound();
    }

    const origin = await this.repository.findSkillOrigin(skill.id);
    return { origin, skill, version };
  }

  private async storeResourceSnapshot(
    content: string,
    resources: TextResourceInput[]
  ) {
    validateResourcePaths(resources);

    const storedResources: StoredResourceObject[] = [
      await this.storage.putTextResource({
        content,
        mediaType: markdownMediaType,
        path: skillContentPath,
      }),
    ];

    for (const resource of resources) {
      storedResources.push(await this.storage.putTextResource(resource));
    }

    return storedResources;
  }

  private async createVersionSnapshot(
    input: {
      changeSummary?: string;
      description: string;
      label?: string;
      resources: StoredResourceObject[];
      skillId: number;
      versionNumber: number;
    },
    now: Date
  ) {
    const version = await this.repository.insertSkillVersion(
      {
        changeSummary: input.changeSummary,
        description: input.description,
        label: input.label,
        skillId: input.skillId,
        versionNumber: input.versionNumber,
      },
      now
    );

    await this.repository.insertSkillResources(
      version.id,
      input.resources,
      now
    );
    return version;
  }

  private async readContentResource(resources: SkillResourceRow[]) {
    const contentResource = resources.find(
      (resource) => resource.path === skillContentPath
    );

    if (!contentResource) {
      throw skillErrors.skillFileNotFound();
    }

    const object = await this.storage.getSkillObject(contentResource.sha256);

    if (!object) {
      throw skillErrors.skillObjectNotFound();
    }

    return object.text();
  }

  private async applyResourcePatch(
    currentResources: SkillResourceRow[],
    input: PatchSkillServiceInput
  ) {
    const nextResources = new Map<string, StoredResourceObject>();

    for (const resource of currentResources) {
      nextResources.set(resource.path, toStoredResource(resource));
    }

    if (input.deleteResourcePaths.includes(skillContentPath)) {
      throw skillErrors.reservedResourcePath();
    }

    for (const path of input.deleteResourcePaths) {
      nextResources.delete(path);
    }

    if (input.content) {
      nextResources.set(
        skillContentPath,
        await this.storage.putTextResource({
          content: input.content,
          mediaType: markdownMediaType,
          path: skillContentPath,
        })
      );
    }

    validateResourcePaths(input.upsertResources);

    for (const resource of input.upsertResources) {
      nextResources.set(
        resource.path,
        await this.storage.putTextResource(resource)
      );
    }

    if (!nextResources.has(skillContentPath)) {
      throw skillErrors.skillFileNotFound();
    }

    return [...nextResources.values()];
  }
}
