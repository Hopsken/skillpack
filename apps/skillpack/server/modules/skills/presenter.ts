import {
  resolvedSkillSchema,
  forkSkillResponseSchema,
  restoreVersionResponseSchema,
  skillListItemSchema,
  skillListResponseSchema,
  skillPatchedResponseSchema,
  skillResourceResponseSchema,
  skillVersionListResponseSchema,
} from "@skillpack/contracts/skills/responses";

import type {
  PatchSkillResult,
  ForkSkillServiceResult,
  ReadSkillTextFileResult,
  ResolvedSkillResult,
  RestoreSkillVersionResult,
  SkillOriginRow,
  SkillVersionRow,
  SkillWithCurrentVersion,
} from "./types";

const presentOrigin = (origin?: SkillOriginRow | null) => {
  if (!origin || origin.kind !== "github") {
    return;
  }

  return {
    kind: "github" as const,
    metadata: origin.metadata,
    url: origin.url,
  };
};

export const presentSkillList = (skills: SkillWithCurrentVersion[]) =>
  skillListResponseSchema.parse({
    skills: skills.map(({ origin, skill, version }) => ({
      allowedTools: version.allowedTools,
      compatibility: version.compatibility,
      createdAt: skill.createdAt.toISOString(),
      currentVersion: version.versionNumber,
      description: version.description,
      license: version.license,
      metadata: version.metadata,
      name: skill.name,
      origin: presentOrigin(origin),
      updatedAt: skill.updatedAt.toISOString(),
    })),
  });

export const presentSkill = (result: ResolvedSkillResult) =>
  resolvedSkillSchema.parse({
    allowedTools: result.version.allowedTools,
    compatibility: result.version.compatibility,
    content: result.content,
    createdAt: result.skill.createdAt.toISOString(),
    description: result.version.description,
    license: result.version.license,
    metadata: result.version.metadata,
    name: result.skill.name,
    origin: presentOrigin(result.origin),
    resources: result.resources.map((resource) => ({
      mediaType: resource.mediaType,
      path: resource.path,
      sha256: resource.sha256,
      size: resource.size,
    })),
    updatedAt: result.skill.updatedAt.toISOString(),
    version: result.version.versionNumber,
    versionLabel: result.version.label,
  });

export const presentSkillSummary = (result: ResolvedSkillResult) =>
  skillListItemSchema.parse({
    allowedTools: result.version.allowedTools,
    compatibility: result.version.compatibility,
    createdAt: result.skill.createdAt.toISOString(),
    currentVersion: result.version.versionNumber,
    description: result.version.description,
    license: result.version.license,
    metadata: result.version.metadata,
    name: result.skill.name,
    origin: presentOrigin(result.origin),
    updatedAt: result.skill.updatedAt.toISOString(),
  });

export const presentForkedSkills = (result: ForkSkillServiceResult) =>
  forkSkillResponseSchema.parse({
    results: result.results.map((item) => {
      if (item.status === "failed") {
        return item;
      }

      return {
        selection: item.selection,
        skill: presentSkillSummary(item.skill),
        status: item.status,
      };
    }),
  });

export const presentSkillVersions = (
  skill: { name: string },
  currentVersion: SkillVersionRow | undefined,
  versions: SkillVersionRow[]
) =>
  skillVersionListResponseSchema.parse({
    currentVersion: currentVersion?.versionNumber ?? 0,
    name: skill.name,
    versions: versions.map((version) => ({
      allowedTools: version.allowedTools,
      changeSummary: version.changeSummary,
      compatibility: version.compatibility,
      createdAt: version.createdAt.toISOString(),
      description: version.description,
      label: version.label,
      license: version.license,
      metadata: version.metadata,
      name: skill.name,
      version: version.versionNumber,
    })),
  });

export const presentSkillFile = (result: ReadSkillTextFileResult) =>
  skillResourceResponseSchema.parse({
    content: result.content,
    mediaType: result.resource.mediaType,
    path: result.resource.path,
    sha256: result.resource.sha256,
    size: result.resource.size,
    version: result.version.versionNumber,
  });

export const presentPatchedSkill = (result: PatchSkillResult) =>
  skillPatchedResponseSchema.parse(result);

export const presentRestoredSkill = (result: RestoreSkillVersionResult) =>
  restoreVersionResponseSchema.parse(result);
