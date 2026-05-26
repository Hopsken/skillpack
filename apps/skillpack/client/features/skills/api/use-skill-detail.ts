import type {
  ResolvedSkill,
  SkillResourceResponse,
  SkillVersionListResponse,
} from "@skillpack/contracts/skills/responses";
import { useQuery } from "@tanstack/react-query";

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
  isLoading: boolean;
  skill: ResolvedSkill | undefined;
  refresh: () => Promise<void>;
}

interface LatestSkillState {
  isLoading: boolean;
  skill: ResolvedSkill | undefined;
  refresh: () => Promise<void>;
}

interface SkillVersionsState {
  isLoading: boolean;
  versions: SkillVersionListResponse | undefined;
}

interface SkillFileState {
  file: SkillResourceResponse | undefined;
  isLoading: boolean;
}

export const useLatestSkill = (
  skillId: number | undefined
): LatestSkillState => {
  const query = useQuery({
    enabled: Boolean(skillId),
    queryFn: () => fetchLatestSkill(skillId ?? 0),
    queryKey: latestSkillQueryKey(skillId),
  });

  const refresh = async (): Promise<void> => {
    await query.refetch();
  };

  return { isLoading: query.isLoading, refresh, skill: query.data };
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

  const refresh = async (): Promise<void> => {
    await query.refetch();
  };

  return { isLoading: query.isLoading, refresh, skill: query.data };
};

export const useSkillVersions = (
  skillId: number | undefined
): SkillVersionsState => {
  const query = useQuery({
    enabled: Boolean(skillId),
    queryFn: () => fetchSkillVersions(skillId ?? 0),
    queryKey: skillVersionsQueryKey(skillId),
  });

  return { isLoading: query.isLoading, versions: query.data };
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

  return { file: query.data, isLoading: query.isLoading };
};
