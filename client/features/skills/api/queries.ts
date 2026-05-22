import {
  skillCatalogResponseSchema,
  skillFileResponseSchema,
  skillReadResponseSchema,
  skillVersionsResponseSchema,
} from "@shared/schemas/skills";
import type {
  SkillCatalogResponse,
  SkillFileResponse,
  SkillReadResponse,
  SkillVersionsResponse,
} from "@shared/schemas/skills";

import { api } from "@/shared/api/client";

export const skillCatalogQueryKey = ["skills", "catalog"] as const;

export const skillDetailQueryKey = (
  name: string | undefined,
  version: string | undefined
) => ["skills", "detail", name, version] as const;

export const latestSkillQueryKey = (name: string | undefined) =>
  ["skills", "latest", name] as const;

export const skillVersionsQueryKey = (name: string | undefined) =>
  ["skills", "versions", name] as const;

export const skillFileQueryKey = (
  name: string | undefined,
  version: string | undefined,
  path: string | undefined
) => ["skills", "file", name, version, path] as const;

export const fetchSkillCatalog = async (): Promise<SkillCatalogResponse> => {
  const data = await api.get("skills/catalog").json();
  return skillCatalogResponseSchema.parse(data);
};

export const fetchLatestSkill = async (
  name: string
): Promise<SkillReadResponse> => {
  const data = await api.get(`skills/${name}`).json();
  return skillReadResponseSchema.parse(data);
};

export const fetchSkillDetail = async (
  name: string,
  version: string
): Promise<SkillReadResponse> => {
  const data = await api.get(`skills/${name}/versions/${version}`).json();
  return skillReadResponseSchema.parse(data);
};

export const fetchSkillVersions = async (
  name: string
): Promise<SkillVersionsResponse> => {
  const data = await api.get(`skills/${name}/versions`).json();
  return skillVersionsResponseSchema.parse(data);
};

export const fetchSkillFile = async (
  name: string,
  version: string,
  path: string
): Promise<SkillFileResponse> => {
  const data = await api
    .get(`skills/${name}/files`, {
      searchParams: { path, version },
    })
    .json();

  return skillFileResponseSchema.parse(data);
};
