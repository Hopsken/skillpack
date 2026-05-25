import type { OriginService } from "@server/modules/origins/service";
import type { OriginSkillDefinition } from "@server/modules/origins/types";

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
  StoredResourceObject,
} from "./types";

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
    const manifest = await this.resourceManifest.resolveSnapshot(resources);

    return {
      content: manifest.content,
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
    const skill = await this.repository.insertSkill(input.name, now);
    const resources = await this.resourceManifest.createSnapshot(
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
    const resources = await this.resourceManifest.patchSnapshot(
      currentResources,
      input
    );
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
        resources: ResourceManifest.restoreSnapshot(sourceResources),
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
    const created = await this.createSkill({
      content: definition.content,
      description: definition.description,
      name: definition.name,
      resources: definition.resources,
      versionLabel,
    });
    const now = new Date();

    await this.repository.insertSkillOrigin(
      {
        kind: definition.provenance.kind,
        metadata: definition.provenance.metadata,
        skillId: created.skill.id,
        url: definition.provenance.url,
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
}
