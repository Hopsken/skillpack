import type {
  OriginSelectionInput,
  SkillOriginInput,
} from "@skillpack/contracts/origins/requests";
import type { ResolvedSkill } from "@skillpack/contracts/skills/responses";
import type { QueryKey } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";

import { getOriginQueryKeyPart } from "../lib/origin-url";
import {
  latestSkillByNameQueryKey,
  latestSkillQueryKey,
  originDefinitionQueryKey,
  originDiscoveryQueryKey,
  skillDetailByNameQueryKey,
  skillDetailQueryKey,
  skillFileQueryKey,
  skillListQueryKey,
  skillVersionsQueryKey,
} from "./query-keys";
import {
  discoverOriginSkills,
  fetchLatestSkill,
  fetchLatestSkillByName,
  fetchSkillDetail,
  fetchSkillDetailByName,
  fetchSkillFile,
  fetchSkillList,
  fetchSkillVersions,
  readSkillDefinitions,
} from "./requests";

const originStaleTimeMs = 60_000;
const versionedSkillGcTimeMs = 60 * 60_000;
const versionedSkillStaleTimeMs = 10 * 60_000;

const getSkillDetailCachePolicy = (version: number | undefined) =>
  version
    ? {
        gcTime: versionedSkillGcTimeMs,
        staleTime: versionedSkillStaleTimeMs,
      }
    : {};

export const skillListQueryOptions = () =>
  queryOptions({
    queryFn: fetchSkillList,
    queryKey: skillListQueryKey,
  });

export const activeSkillQueryOptions = (
  skillId: number,
  version: number | undefined
) =>
  queryOptions<ResolvedSkill, Error, ResolvedSkill, QueryKey>({
    ...getSkillDetailCachePolicy(version),
    queryFn: () =>
      version ? fetchSkillDetail(skillId, version) : fetchLatestSkill(skillId),
    queryKey: version
      ? skillDetailQueryKey(skillId, version)
      : latestSkillQueryKey(skillId),
  });

export const activeSkillByNameQueryOptions = (
  skillName: string,
  version: number | undefined
) =>
  queryOptions<ResolvedSkill, Error, ResolvedSkill, QueryKey>({
    ...getSkillDetailCachePolicy(version),
    queryFn: () =>
      version
        ? fetchSkillDetailByName(skillName, version)
        : fetchLatestSkillByName(skillName),
    queryKey: version
      ? skillDetailByNameQueryKey(skillName, version)
      : latestSkillByNameQueryKey(skillName),
  });

export const skillVersionsQueryOptions = (skillId: number) =>
  queryOptions({
    queryFn: () => fetchSkillVersions(skillId),
    queryKey: skillVersionsQueryKey(skillId),
  });

export const skillFileQueryOptions = (
  skillId: number,
  version: number,
  path: string
) =>
  queryOptions({
    queryFn: () => fetchSkillFile(skillId, version, path),
    queryKey: skillFileQueryKey(skillId, version, path),
  });

export const originDiscoveryQueryOptions = (origin: SkillOriginInput) => {
  const originKey = getOriginQueryKeyPart(origin);

  return queryOptions({
    queryFn: () => discoverOriginSkills(origin),
    queryKey: originDiscoveryQueryKey(originKey),
    staleTime: originStaleTimeMs,
  });
};

export const originDefinitionQueryOptions = (
  origin: SkillOriginInput,
  selection: OriginSelectionInput
) => {
  const originKey = getOriginQueryKeyPart(origin);

  return queryOptions({
    queryFn: async () => {
      const response = await readSkillDefinitions({
        origin,
        selections: [selection],
      });
      const result = response.results.at(0);

      if (!result) {
        throw new Error("Missing Skill Origin Definition Result");
      }

      return result;
    },
    queryKey: originDefinitionQueryKey(originKey, selection.skillName),
    staleTime: originStaleTimeMs,
  });
};
