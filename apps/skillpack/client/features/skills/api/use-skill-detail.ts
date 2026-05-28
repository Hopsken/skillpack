import { useQuery } from "@tanstack/react-query";

import {
  activeSkillQueryOptions,
  skillFileQueryOptions,
  skillVersionsQueryOptions,
} from "./query-options";

export const useSkillDetail = (skillId: number, version: number | undefined) =>
  useQuery({
    ...activeSkillQueryOptions(skillId, version),
    placeholderData: (previousSkill) =>
      previousSkill?.id === skillId ? previousSkill : undefined,
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
