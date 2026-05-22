import {
  resolvedSkillSchema,
  skillListResponseSchema,
  skillResourceResponseSchema,
  skillVersionListResponseSchema,
} from "@shared/schemas/skills";
import type {
  ResolvedSkill,
  SkillListResponse,
  SkillResourceResponse,
  SkillVersionListResponse,
} from "@shared/schemas/skills";

import { api } from "@/shared/api/client";

export const skillListQueryKey = ["skills", "list"] as const;

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

export const fetchSkillList = async (): Promise<SkillListResponse> => {
  const data = await api.get("skills").json();
  return skillListResponseSchema.parse(data);
};

export const fetchLatestSkill = async (
  handle: string
): Promise<ResolvedSkill> => {
  const data = await api.get(`skills/skillpack/${handle}`).json();
  return resolvedSkillSchema.parse(data);
};

export const fetchSkillDetail = async (
  handle: string,
  version: string
): Promise<ResolvedSkill> => {
  const data = await api
    .get(`skills/skillpack/${handle}`, { searchParams: { version } })
    .json();
  return resolvedSkillSchema.parse(data);
};

export const fetchSkillVersions = async (
  handle: string
): Promise<SkillVersionListResponse> => {
  const data = await api.get(`skills/skillpack/${handle}/versions`).json();
  return skillVersionListResponseSchema.parse(data);
};

export const fetchSkillFile = async (
  handle: string,
  version: string,
  path: string
): Promise<SkillResourceResponse> => {
  const data = await api
    .get(`skills/skillpack/${handle}/resources`, {
      searchParams: { path, version },
    })
    .json();

  return skillResourceResponseSchema.parse(data);
};
