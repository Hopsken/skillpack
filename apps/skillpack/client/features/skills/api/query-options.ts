import type {
  OriginSelectionInput,
  SkillOriginInput,
} from "@skillpack/contracts/origins/requests";
import type { ResolvedSkill } from "@skillpack/contracts/skills/responses";
import type { QueryKey } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";

import { getOriginQueryKeyPart } from "../lib/origin-url";
import {
  latestSkillQueryKey,
  originDefinitionQueryKey,
  originDiscoveryQueryKey,
  skillDetailQueryKey,
  skillFileQueryKey,
  skillListQueryKey,
  skillVersionsQueryKey,
} from "./query-keys";
import {
  discoverOriginSkills,
  fetchLatestSkill,
  fetchSkillDetail,
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
  skillName: string,
  version: number | undefined
) =>
  queryOptions<ResolvedSkill, Error, ResolvedSkill, QueryKey>({
    ...getSkillDetailCachePolicy(version),
    queryFn: () =>
      version
        ? fetchSkillDetail(skillName, version)
        : fetchLatestSkill(skillName),
    queryKey: version
      ? skillDetailQueryKey(skillName, version)
      : latestSkillQueryKey(skillName),
  });

export const skillVersionsQueryOptions = (skillName: string) =>
  queryOptions({
    queryFn: () => fetchSkillVersions(skillName),
    queryKey: skillVersionsQueryKey(skillName),
  });

export const skillFileQueryOptions = (
  skillName: string,
  version: number,
  path: string
) =>
  queryOptions({
    queryFn: () => fetchSkillFile(skillName, version, path),
    queryKey: skillFileQueryKey(skillName, version, path),
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
