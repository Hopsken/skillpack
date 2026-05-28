import type {
  ResolvedSkill,
  SkillResourceResponse,
  SkillVersionListResponse,
} from "@skillpack/contracts/skills/responses";
import { useQuery } from "@tanstack/react-query";

import {
  fetchSkillFile,
  fetchSkillVersions,
  latestSkillQueryOptions,
  skillDetailQueryOptions,
  skillFileQueryKey,
  skillVersionsQueryKey,
} from "./queries";

interface SkillDetailState {
  isFetching: boolean;
  isLoading: boolean;
  isPending: boolean;
  skill: ResolvedSkill | undefined;
  refresh: () => Promise<void>;
}

interface LatestSkillState {
  isFetching: boolean;
  isLoading: boolean;
  isPending: boolean;
  skill: ResolvedSkill | undefined;
  refresh: () => Promise<void>;
}

interface SkillVersionsState {
  isFetching: boolean;
  isLoading: boolean;
  isPending: boolean;
  versions: SkillVersionListResponse | undefined;
}

interface SkillFileState {
  file: SkillResourceResponse | undefined;
  isFetching: boolean;
  isLoading: boolean;
  isPending: boolean;
}

export const useLatestSkill = (
  skillId: number | undefined
): LatestSkillState => {
  const query = useQuery({
    enabled: Boolean(skillId),
    ...latestSkillQueryOptions(skillId ?? 0),
  });

  const refresh = async (): Promise<void> => {
    await query.refetch();
  };

  return {
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    isPending: query.isPending,
    refresh,
    skill: query.data,
  };
};

export const useSkillDetail = (
  skillId: number | undefined,
  version: number | undefined
): SkillDetailState => {
  const query = useQuery({
    enabled: Boolean(skillId && version),
    placeholderData: (previousSkill) =>
      previousSkill?.id === skillId ? previousSkill : undefined,
    ...skillDetailQueryOptions(skillId ?? 0, version ?? 0),
  });

  const refresh = async (): Promise<void> => {
    await query.refetch();
  };

  return {
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    isPending: query.isPending,
    refresh,
    skill: query.data,
  };
};

export const useSkillVersions = (
  skillId: number | undefined
): SkillVersionsState => {
  const query = useQuery({
    enabled: Boolean(skillId),
    queryFn: () => fetchSkillVersions(skillId ?? 0),
    queryKey: skillVersionsQueryKey(skillId),
  });

  return {
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    isPending: query.isPending,
    versions: query.data,
  };
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

  return {
    file: query.data,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    isPending: query.isPending,
  };
};
