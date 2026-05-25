import type {
  ResolvedSkill,
  SkillResourceResponse,
  SkillVersionListResponse,
} from "@shared/contract/skills/responses";
import { useQuery } from "@tanstack/react-query";

import { getApiErrorMessage } from "@/shared/api/client";

import {
  fetchLatestSkill,
  fetchSkillDetail,
  fetchSkillFile,
  fetchSkillVersions,
  latestSkillQueryKey,
  skillDetailQueryKey,
  skillFileQueryKey,
  skillVersionsQueryKey,
} from "./queries";

interface SkillDetailState {
  skill: ResolvedSkill | undefined;
  status: string;
  refresh: () => Promise<void>;
}

interface LatestSkillState {
  skill: ResolvedSkill | undefined;
  status: string;
  refresh: () => Promise<void>;
}

interface SkillVersionsState {
  versions: SkillVersionListResponse | undefined;
  status: string;
}

interface SkillFileState {
  file: SkillResourceResponse | undefined;
  status: string;
}

export const useLatestSkill = (
  skillId: number | undefined
): LatestSkillState => {
  const query = useQuery({
    enabled: Boolean(skillId),
    queryFn: () => fetchLatestSkill(skillId ?? 0),
    queryKey: latestSkillQueryKey(skillId),
  });

  const status = query.isLoading
    ? "Loading skill..."
    : getApiErrorMessage(
        query.error,
        query.data
          ? `Loaded ${query.data.name} v${query.data.version}`
          : "Skill loaded"
      );

  const refresh = async (): Promise<void> => {
    await query.refetch();
  };

  return { refresh, skill: query.data, status };
};

export const useSkillDetail = (
  skillId: number | undefined,
  version: number | undefined
): SkillDetailState => {
  const query = useQuery({
    enabled: Boolean(skillId && version),
    queryFn: () => fetchSkillDetail(skillId ?? 0, version ?? 0),
    queryKey: skillDetailQueryKey(skillId, version),
  });

  const status = query.isLoading
    ? "Loading skill..."
    : getApiErrorMessage(
        query.error,
        query.data
          ? `Loaded ${query.data.name} v${query.data.version}`
          : "Skill loaded"
      );

  const refresh = async (): Promise<void> => {
    await query.refetch();
  };

  return { refresh, skill: query.data, status };
};

export const useSkillVersions = (
  skillId: number | undefined
): SkillVersionsState => {
  const query = useQuery({
    enabled: Boolean(skillId),
    queryFn: () => fetchSkillVersions(skillId ?? 0),
    queryKey: skillVersionsQueryKey(skillId),
  });

  const versionCount = query.data?.versions.length ?? 0;
  const status = query.isLoading
    ? "Loading versions..."
    : getApiErrorMessage(query.error, `${versionCount} versions loaded`);

  return { status, versions: query.data };
};

export const useSkillFile = (
  skillId: number | undefined,
  version: number | undefined,
  path: string | undefined
): SkillFileState => {
  const query = useQuery({
    enabled: Boolean(skillId && version && path),
    queryFn: () => fetchSkillFile(skillId ?? 0, version ?? 0, path ?? ""),
    queryKey: skillFileQueryKey(skillId, version, path),
  });

  if (!path) {
    return { file: query.data, status: "Select a resource" };
  }

  const status = query.isLoading
    ? "Loading resource..."
    : getApiErrorMessage(
        query.error,
        query.data ? `Loaded ${query.data.path}` : "Resource loaded"
      );

  return { file: query.data, status };
};
