import { skillContentPath } from "@server/constants";
import type { OriginService } from "@server/modules/origins/service";
import type { OriginSkillDefinition } from "@server/modules/origins/types";
import type { SkillFileMetadata } from "@server/shared/skill-file";
import { parseSkillFile, serializeSkillFile } from "@server/shared/skill-file";

import { skillErrors } from "./errors";
import type { SkillRepository } from "./repository";
import { ResourceManifest } from "./resource-manifest";
import type {
  CreateSkillServiceInput,
  ForkSkillServiceInput,
  ForkSkillServiceResult,
  PatchSkillResult,
  PatchSkillServiceInput,
  ReadSkillFileInput,
  ReadSkillFileResult,
  ReadSkillTextFileResult,
  ResolvedSkillResult,
  RestoreSkillVersionResult,
  RestoreVersionServiceInput,
  SkillResourceRow,
  SkillVersionRow,
  StoredResourceObject,
} from "./types";

const getVersionSkillFileMetadata = (version: SkillVersionRow) => ({
  allowedTools: version.allowedTools,
  compatibility: version.compatibility,
  description: version.description,
  license: version.license,
  metadata: version.metadata,
  name: version.name,
});

const patchValue = <T>(
  input: Record<string, unknown>,
  key: string,
  current: T
) => (Object.hasOwn(input, key) ? (input[key] as T) : current);

const metadataEquals = (
  left: Record<string, string> | null | undefined,
  right: Record<string, string> | null | undefined
) => {
  const leftEntries = Object.entries(left ?? {});
  const rightEntries = Object.entries(right ?? {});

  return (
    leftEntries.length === rightEntries.length &&
    leftEntries.every(([key, value]) => right?.[key] === value)
  );
};

const skillFileMetadataEquals = (
  left: SkillFileMetadata,
  right: SkillFileMetadata
) =>
  left.allowedTools === right.allowedTools &&
  left.compatibility === right.compatibility &&
  left.description === right.description &&
  left.license === right.license &&
  metadataEquals(left.metadata, right.metadata) &&
  left.name === right.name;

export class SkillService {
  private readonly repository: SkillRepository;

  private readonly originService: OriginService;

  private readonly resourceManifest: ResourceManifest;

  constructor(
    repository: SkillRepository,
    resourceManifest: ResourceManifest,
    originService: OriginService
  ) {
    this.repository = repository;
    this.originService = originService;
    this.resourceManifest = resourceManifest;
  }

  listSkills() {
    return this.repository.listSkills();
  }

  async listSkillVersionsForSkill(skillId: number) {
    const skill = await this.repository.findSkillById(skillId);

    if (!skill) {
      throw skillErrors.skillNotFound();
    }

    const currentVersion = await this.repository.findLatestSkillVersion(
      skill.id
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
    const manifest = ResourceManifest.resolveSnapshot(resources);
    const skillFile = await this.readVersionSkillFile(manifest.resources);

    return {
      content: skillFile.body,
      origin,
      resources: manifest.resources,
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

    const object = await this.resourceManifest.getResourceObject(resource);

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
    const skill = await this.repository.insertSkill(now);
    const skillFileContent = serializeSkillFile(input, input.content);
    const skillFile =
      await this.resourceManifest.storeSkillFile(skillFileContent);
    const resourceManifest = await this.resourceManifest.createSnapshot(
      input.resources
    );
    const resources = [skillFile, ...resourceManifest];

    await this.createVersionSnapshot(
      {
        changeSummary: input.changeSummary,
        label: input.versionLabel,
        resources,
        skillFileMetadata: input,
        skillId: skill.id,
      },
      now
    );

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
    const currentSkillFile = await this.readVersionSkillFile(currentResources);
    const nextMetadata = {
      allowedTools: patchValue(
        input,
        "allowedTools",
        currentSkillFile.allowedTools
      ),
      compatibility: patchValue(
        input,
        "compatibility",
        currentSkillFile.compatibility
      ),
      description: input.description ?? currentSkillFile.description,
      license: patchValue(input, "license", currentSkillFile.license),
      metadata: patchValue(input, "metadata", currentSkillFile.metadata),
      name: input.name ?? currentSkillFile.name,
    };
    const nextBody = input.content ?? currentSkillFile.body;
    const hasResourceChanges =
      input.deleteResourcePaths.length > 0 || input.upsertResources.length > 0;

    if (
      !hasResourceChanges &&
      nextBody === currentSkillFile.body &&
      skillFileMetadataEquals(nextMetadata, currentSkillFile)
    ) {
      throw skillErrors.emptySkillPatch();
    }

    const skillFileContent = serializeSkillFile(
      nextMetadata,
      nextBody,
      currentSkillFile.frontmatter
    );
    const skillFile =
      await this.resourceManifest.storeSkillFile(skillFileContent);
    const resourceManifest = await this.resourceManifest.patchSnapshot(
      currentResources,
      input
    );
    const resources = [
      skillFile,
      ...resourceManifest.filter(
        (resource) => resource.path !== skillContentPath
      ),
    ];
    const now = new Date();
    const nextVersion = await this.createVersionSnapshot(
      {
        changeSummary: input.changeSummary,
        label: input.versionLabel,
        resources,
        skillFileMetadata: nextMetadata,
        skillId: skill.id,
      },
      now
    );

    return {
      allowedTools: nextVersion.allowedTools,
      compatibility: nextVersion.compatibility,
      currentVersion: nextVersion.versionNumber,
      description: nextVersion.description,
      id: skill.id,
      license: nextVersion.license,
      metadata: nextVersion.metadata,
      name: nextVersion.name,
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
    const nextVersion = await this.createVersionSnapshot(
      {
        changeSummary: input.changeSummary,
        label: input.versionLabel,
        resources: ResourceManifest.restoreSnapshot(sourceResources),
        skillFileMetadata: getVersionSkillFileMetadata(version),
        skillId: skill.id,
      },
      now
    );

    return {
      currentVersion: nextVersion.versionNumber,
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

  async forkSkill(
    input: ForkSkillServiceInput
  ): Promise<ForkSkillServiceResult> {
    const definitions = await this.originService.readSkillDefinitions(
      input.origin,
      input.selections
    );
    const results: ForkSkillServiceResult["results"] = [];

    for (const definitionResult of definitions) {
      if (definitionResult.status === "failed") {
        results.push(definitionResult);
        continue;
      }

      try {
        results.push({
          selection: definitionResult.definition.selection,
          skill: await this.forkSkillDefinition(
            definitionResult.definition,
            input.versionLabel
          ),
          status: "forked",
        });
      } catch (error) {
        results.push({
          error: error instanceof Error ? error.message : "Fork failed",
          selection: definitionResult.definition.selection,
          status: "failed",
        });
      }
    }

    return { results };
  }

  private async forkSkillDefinition(
    definition: OriginSkillDefinition,
    versionLabel: string | undefined
  ) {
    const now = new Date();
    const skill = await this.repository.insertSkill(now);
    const skillFile = await this.resourceManifest.storeSkillFile(
      definition.content
    );
    const resourceManifest = await this.resourceManifest.createSnapshot(
      definition.resources
    );
    const resources = [skillFile, ...resourceManifest];

    await this.createVersionSnapshot(
      {
        label: versionLabel,
        resources,
        skillFileMetadata: definition,
        skillId: skill.id,
      },
      now
    );
    await this.repository.insertSkillOrigin(
      {
        kind: definition.provenance.kind,
        metadata: definition.provenance.metadata,
        skillId: skill.id,
        url: definition.provenance.url,
      },
      now
    );

    return this.resolveSkill(skill.id);
  }

  private async readSkillVersion(skillId: number, requestedVersion?: number) {
    const skill = await this.repository.findSkillById(skillId);

    if (!skill) {
      throw skillErrors.skillNotFound();
    }

    const version = requestedVersion
      ? await this.repository.findSkillVersionByNumber(
          skill.id,
          requestedVersion
        )
      : await this.repository.findLatestSkillVersion(skill.id);

    if (!version) {
      throw skillErrors.skillVersionNotFound();
    }

    const origin = await this.repository.findSkillOrigin(skill.id);
    return { origin, skill, version };
  }

  private async readVersionSkillFile(resources: SkillResourceRow[]) {
    const skillFileResource = resources.find(
      (resource) => resource.path === skillContentPath
    );

    if (!skillFileResource) {
      throw skillErrors.skillFileNotFound();
    }

    const object =
      await this.resourceManifest.getResourceObject(skillFileResource);

    return parseSkillFile(await object.text());
  }

  private createVersionSnapshot(
    input: {
      changeSummary?: string | null;
      label?: string;
      resources: StoredResourceObject[];
      skillFileMetadata: {
        allowedTools?: string | null;
        compatibility?: string | null;
        description: string;
        license?: string | null;
        metadata?: Record<string, string> | null;
        name: string;
      };
      skillId: number;
    },
    now: Date
  ) {
    return this.repository.commitSkillVersion(input, now);
  }
}
