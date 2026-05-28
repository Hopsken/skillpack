import type {
  DiscoverSkillsInput,
  SkillOriginInput,
  ReadSkillDefinitionsInput,
} from "@skillpack/contracts/origins/requests";
import {
  discoverSkillsResponseSchema,
  readSkillDefinitionsResponseSchema,
} from "@skillpack/contracts/origins/responses";
import type {
  DiscoverSkillsResponse,
  ReadSkillDefinitionsResponse,
} from "@skillpack/contracts/origins/responses";
import type {
  CreateSkillInput,
  ForkSkillInput,
  PatchSkillInput,
  RestoreVersionInput,
} from "@skillpack/contracts/skills/requests";
import {
  forkSkillResponseSchema,
  resolvedSkillSchema,
  restoreVersionResponseSchema,
  skillListItemSchema,
  skillListResponseSchema,
  skillPatchedResponseSchema,
  skillResourceResponseSchema,
  skillVersionListResponseSchema,
} from "@skillpack/contracts/skills/responses";
import type {
  ResolvedSkill,
  ForkSkillResponse,
  SkillListItem,
  SkillListResponse,
  SkillPatchedResponse,
  SkillResourceResponse,
  SkillVersionListResponse,
} from "@skillpack/contracts/skills/responses";
import { queryOptions } from "@tanstack/react-query";

import { api } from "@/shared/api/client";

export const skillListQueryKey = ["skills", "list"] as const;

export const skillDetailQueryKey = (
  skillId: number | undefined,
  version?: number
) => ["skills", "detail", skillId, version] as const;

export const skillDetailQueryPrefix = (skillId: number | undefined) =>
  ["skills", "detail", skillId] as const;

export const latestSkillQueryKey = (skillId: number | undefined) =>
  ["skills", "latest", skillId] as const;

export const skillVersionsQueryKey = (skillId: number | undefined) =>
  ["skills", "versions", skillId] as const;

export const skillFileQueryKey = (
  skillId: number | undefined,
  version: number | undefined,
  path: string | undefined
) => ["skills", "file", skillId, version, path] as const;

export const skillFileQueryPrefix = (skillId: number | undefined) =>
  ["skills", "file", skillId] as const;

export const originDiscoveryQueryKey = (originKey: string | undefined) =>
  ["origins", "discover", originKey] as const;

export const originDefinitionQueryKey = (
  originKey: string | undefined,
  skillName: string | undefined
) => ["origins", "definitions", originKey, skillName] as const;

export const fetchSkillList = async (): Promise<SkillListResponse> => {
  const data = await api.get("skills").json();
  return skillListResponseSchema.parse(data);
};

export const skillListQueryOptions = () =>
  queryOptions({
    queryFn: fetchSkillList,
    queryKey: skillListQueryKey,
  });

export const fetchLatestSkill = async (
  skillId: number
): Promise<ResolvedSkill> => {
  const data = await api.get(`skills/${skillId}`).json();
  return resolvedSkillSchema.parse(data);
};

export const latestSkillQueryOptions = (skillId: number) =>
  queryOptions({
    queryFn: () => fetchLatestSkill(skillId),
    queryKey: latestSkillQueryKey(skillId),
  });

export const fetchSkillDetail = async (
  skillId: number,
  version: number
): Promise<ResolvedSkill> => {
  const data = await api
    .get(`skills/${skillId}`, { searchParams: { version } })
    .json();
  return resolvedSkillSchema.parse(data);
};

export const skillDetailQueryOptions = (skillId: number, version: number) =>
  queryOptions({
    queryFn: () => fetchSkillDetail(skillId, version),
    queryKey: skillDetailQueryKey(skillId, version),
  });

export const fetchSkillVersions = async (
  skillId: number
): Promise<SkillVersionListResponse> => {
  const data = await api.get(`skills/${skillId}/versions`).json();
  return skillVersionListResponseSchema.parse(data);
};

export const fetchSkillFile = async (
  skillId: number,
  version: number,
  path: string
): Promise<SkillResourceResponse> => {
  const data = await api
    .get(`skills/${skillId}/resources`, {
      searchParams: { path, version },
    })
    .json();

  return skillResourceResponseSchema.parse(data);
};

export const createManagedSkill = async (
  input: CreateSkillInput
): Promise<SkillListItem> => {
  const data = await api.post("skills", { json: input }).json();
  return skillListItemSchema.parse(data);
};

export const discoverSkills = async (
  input: DiscoverSkillsInput
): Promise<DiscoverSkillsResponse> => {
  const data = await api.post("origins/discover", { json: input }).json();
  return discoverSkillsResponseSchema.parse(data);
};

export const discoverOriginSkills = (origin: SkillOriginInput) =>
  discoverSkills({ origin });

export const readSkillDefinitions = async (
  input: ReadSkillDefinitionsInput
): Promise<ReadSkillDefinitionsResponse> => {
  const data = await api.post("origins/definitions", { json: input }).json();
  return readSkillDefinitionsResponseSchema.parse(data);
};

export const patchManagedSkill = async (
  skillId: number,
  input: PatchSkillInput
): Promise<SkillPatchedResponse> => {
  const data = await api.patch(`skills/${skillId}`, { json: input }).json();
  return skillPatchedResponseSchema.parse(data);
};

export const restoreManagedSkillVersion = async (
  skillId: number,
  version: number,
  input: RestoreVersionInput
) => {
  const data = await api
    .post(`skills/${skillId}/versions/${version}/restore`, { json: input })
    .json();
  return restoreVersionResponseSchema.parse(data);
};

export const forkManagedSkill = async (
  input: ForkSkillInput
): Promise<ForkSkillResponse> => {
  const data = await api.post("skills/fork", { json: input }).json();
  return forkSkillResponseSchema.parse(data);
};
