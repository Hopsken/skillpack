import {
  resolvedSkillSchema,
  skillListItemSchema,
  skillListResponseSchema,
  skillResourceResponseSchema,
  skillVersionListResponseSchema,
} from "@shared/schemas/skills";

import type {
  CreateSkillResult,
  ReadSkillResult,
  ReadSkillTextFileResult,
  SkillRow,
  SkillVersionRow,
} from "./types";

const presentTrust = (approvedAt: Date) => ({
  approvedAt: approvedAt.toISOString(),
  status: "approved" as const,
});

const presentSource = (sourceType: string) => ({
  type: sourceType,
});

export const presentSkillList = (skills: SkillRow[]) =>
  skillListResponseSchema.parse({
    skills: skills.map((skill) => ({
      description: skill.description,
      handle: skill.handle,
      location: skill.location,
      name: skill.name,
      source: presentSource(skill.sourceType),
      trust: presentTrust(skill.updatedAt),
      version: skill.currentApprovedVersion,
    })),
  });

export const presentSkill = (result: ReadSkillResult) =>
  resolvedSkillSchema.parse({
    content: result.content,
    description: result.skill.description,
    handle: result.skill.handle,
    location: result.skill.location,
    name: result.skill.name,
    resolvedLocation: result.version.resolvedLocation,
    resources: result.resources.map((resource) => ({
      mediaType: resource.mediaType,
      path: resource.path,
      sha256: resource.sha256,
      size: resource.size,
    })),
    source: presentSource(result.skill.sourceType),
    trust: presentTrust(result.version.approvedAt),
    version: result.version.version,
  });

export const presentSkillVersions = (
  skill: SkillRow,
  versions: SkillVersionRow[]
) =>
  skillVersionListResponseSchema.parse({
    handle: skill.handle,
    location: skill.location,
    name: skill.name,
    versions: versions.map((version) => ({
      createdAt: version.createdAt.toISOString(),
      location: version.location,
      resolvedLocation: version.resolvedLocation,
      trust: presentTrust(version.approvedAt),
      version: version.version,
    })),
  });

export const presentSkillFile = (result: ReadSkillTextFileResult) =>
  skillResourceResponseSchema.parse({
    content: result.content,
    mediaType: result.resource.mediaType,
    path: result.resource.path,
    sha256: result.resource.sha256,
    size: result.resource.size,
    version: result.version.version,
  });

export const presentCreatedSkill = (result: CreateSkillResult) =>
  skillListItemSchema.parse({
    description: result.description,
    handle: result.handle,
    location: result.location,
    name: result.name,
    source: presentSource("skillpack"),
    trust: {
      approvedAt: result.trust.approvedAt.toISOString(),
      status: result.trust.status,
    },
    version: result.version,
  });
