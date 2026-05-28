import type {
  OriginSelectionInput,
  SkillOriginInput,
} from "@skillpack/contracts/origins/requests";
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

export const skillListQueryOptions = () =>
  queryOptions({
    queryFn: fetchSkillList,
    queryKey: skillListQueryKey,
  });

export const latestSkillQueryOptions = (skillId: number) =>
  queryOptions({
    queryFn: () => fetchLatestSkill(skillId),
    queryKey: latestSkillQueryKey(skillId),
  });

export const skillDetailQueryOptions = (skillId: number, version: number) =>
  queryOptions({
    queryFn: () => fetchSkillDetail(skillId, version),
    queryKey: skillDetailQueryKey(skillId, version),
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
