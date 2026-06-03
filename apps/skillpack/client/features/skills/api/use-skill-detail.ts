import { useQuery } from "@tanstack/react-query";

import {
  activeSkillQueryOptions,
  skillFileQueryOptions,
  skillVersionsQueryOptions,
} from "./query-options";

export const useSkillDetail = (
  skillName: string,
  version: number | undefined
) =>
  useQuery({
    ...activeSkillQueryOptions(skillName, version),
    placeholderData: (previousSkill) =>
      previousSkill?.name === skillName ? previousSkill : undefined,
  });

export const useSkillVersions = (skillName: string | undefined) =>
  useQuery({
    enabled: Boolean(skillName),
    ...skillVersionsQueryOptions(skillName ?? ""),
    select: (data) => data.versions,
  });

export const useSkillFile = (
  skillName: string | undefined,
  version: number | undefined,
  path: string | undefined
) =>
  useQuery({
    enabled: Boolean(skillName && version && path),
    ...skillFileQueryOptions(skillName ?? "", version ?? 0, path ?? ""),
  });
