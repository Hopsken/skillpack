import { skillLocation } from "@server/lib/http";
import {
  skillCatalogItemSchema,
  skillCatalogResponseSchema,
  skillFileResponseSchema,
  skillReadResponseSchema,
  skillVersionsResponseSchema,
} from "@shared/schemas/skills";

import type {
  CreateSkillResult,
  ReadSkillResult,
  ReadSkillTextFileResult,
  SkillRow,
  SkillVersionRow,
} from "./types";

export const presentSkillCatalog = (skills: SkillRow[]) =>
  skillCatalogResponseSchema.parse({
    skills: skills.map((skill) => ({
      description: skill.description,
      location: skillLocation(skill.name),
      name: skill.name,
      version: skill.latestVersion,
    })),
  });

export const presentSkill = (result: ReadSkillResult) =>
  skillReadResponseSchema.parse({
    content: result.content,
    description: result.skill.description,
    location: skillLocation(result.skill.name, result.version.entryPath),
    name: result.skill.name,
    resources: result.resources.map((resource) => ({
      mediaType: resource.mediaType,
      path: resource.path,
      sha256: resource.sha256,
      size: resource.size,
    })),
    version: result.version.version,
  });

export const presentSkillVersions = (
  skill: SkillRow,
  versions: SkillVersionRow[]
) =>
  skillVersionsResponseSchema.parse({
    name: skill.name,
    versions: versions.map((version) => ({
      createdAt: version.createdAt.toISOString(),
      location: skillLocation(skill.name, version.entryPath),
      version: version.version,
    })),
  });

export const presentSkillFile = (result: ReadSkillTextFileResult) =>
  skillFileResponseSchema.parse({
    content: result.content,
    mediaType: result.resource.mediaType,
    path: result.resource.path,
    sha256: result.resource.sha256,
    size: result.resource.size,
    version: result.version.version,
  });

export const presentCreatedSkill = (result: CreateSkillResult) =>
  skillCatalogItemSchema.parse({
    description: result.description,
    location: skillLocation(result.name),
    name: result.name,
    version: result.version,
  });
