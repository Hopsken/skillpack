import { useQuery } from "@tanstack/react-query";

import {
  latestSkillQueryOptions,
  skillDetailQueryOptions,
  skillFileQueryOptions,
  skillVersionsQueryOptions,
} from "./query-options";

export const useLatestSkill = (skillId: number | undefined) =>
  useQuery({
    enabled: Boolean(skillId),
    ...latestSkillQueryOptions(skillId ?? 0),
  });

export const useSkillDetail = (
  skillId: number | undefined,
  version: number | undefined
) =>
  useQuery({
    enabled: Boolean(skillId && version),
    placeholderData: (previousSkill) =>
      previousSkill?.id === skillId ? previousSkill : undefined,
    ...skillDetailQueryOptions(skillId ?? 0, version ?? 0),
  });

export const useSkillVersions = (skillId: number | undefined) =>
  useQuery({
    enabled: Boolean(skillId),
    ...skillVersionsQueryOptions(skillId ?? 0),
    select: (data) => data.versions,
  });

export const useSkillFile = (
  skillId: number | undefined,
  version: number | undefined,
  path: string | undefined
) =>
  useQuery({
    enabled: Boolean(skillId && version && path),
    ...skillFileQueryOptions(skillId ?? 0, version ?? 0, path ?? ""),
  });
