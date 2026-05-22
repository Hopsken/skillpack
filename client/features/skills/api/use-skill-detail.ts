import type {
  ResolvedSkill,
  SkillResourceResponse,
  SkillVersionListResponse,
} from "@shared/schemas/skills";
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

export const useLatestSkill = (name: string | undefined): LatestSkillState => {
  const query = useQuery({
    enabled: Boolean(name),
    queryFn: () => fetchLatestSkill(name ?? ""),
    queryKey: latestSkillQueryKey(name),
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
  name: string | undefined,
  version: string | undefined
): SkillDetailState => {
  const query = useQuery({
    enabled: Boolean(name && version),
    queryFn: () => fetchSkillDetail(name ?? "", version ?? ""),
    queryKey: skillDetailQueryKey(name, version),
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
  name: string | undefined
): SkillVersionsState => {
  const query = useQuery({
    enabled: Boolean(name),
    queryFn: () => fetchSkillVersions(name ?? ""),
    queryKey: skillVersionsQueryKey(name),
  });

  const versionCount = query.data?.versions.length ?? 0;
  const status = query.isLoading
    ? "Loading versions..."
    : getApiErrorMessage(query.error, `${versionCount} versions loaded`);

  return { status, versions: query.data };
};

export const useSkillFile = (
  name: string | undefined,
  version: string | undefined,
  path: string | undefined
): SkillFileState => {
  const query = useQuery({
    enabled: Boolean(name && version && path),
    queryFn: () => fetchSkillFile(name ?? "", version ?? "", path ?? ""),
    queryKey: skillFileQueryKey(name, version, path),
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
