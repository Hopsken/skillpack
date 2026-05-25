import {
  resolvedSkillSchema,
  restoreVersionResponseSchema,
  skillListItemSchema,
  skillListResponseSchema,
  skillPatchedResponseSchema,
  skillResourceResponseSchema,
  skillVersionListResponseSchema,
} from "@shared/contract/skills/responses";

import type {
  PatchSkillResult,
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
      createdAt: skill.createdAt.toISOString(),
      currentVersion: version.versionNumber,
      description: version.description,
      id: skill.id,
      name: skill.name,
      origin: presentOrigin(origin),
      updatedAt: skill.updatedAt.toISOString(),
    })),
  });

export const presentSkill = (result: ResolvedSkillResult) =>
  resolvedSkillSchema.parse({
    content: result.content,
    createdAt: result.skill.createdAt.toISOString(),
    description: result.version.description,
    id: result.skill.id,
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
    createdAt: result.skill.createdAt.toISOString(),
    currentVersion: result.version.versionNumber,
    description: result.version.description,
    id: result.skill.id,
    name: result.skill.name,
    origin: presentOrigin(result.origin),
    updatedAt: result.skill.updatedAt.toISOString(),
  });

export const presentSkillVersions = (
  skill: { currentVersionId: number | null; id: number; name: string },
  currentVersion: SkillVersionRow | undefined,
  versions: SkillVersionRow[]
) =>
  skillVersionListResponseSchema.parse({
    currentVersion: currentVersion?.versionNumber ?? 0,
    id: skill.id,
    name: skill.name,
    versions: versions.map((version) => ({
      changeSummary: version.changeSummary,
      createdAt: version.createdAt.toISOString(),
      description: version.description,
      label: version.label,
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
