export const skillListQueryKey = ["skills", "list"] as const;
export const skillQueryPrefix = ["skills"] as const;

export const skillDetailQueryKey = (
  skillId: number | undefined,
  version?: number
) => ["skills", "detail", skillId, version] as const;

export const skillDetailQueryPrefix = (skillId: number | undefined) =>
  ["skills", "detail", skillId] as const;

export const latestSkillQueryKey = (skillId: number | undefined) =>
  ["skills", "latest", skillId] as const;

export const skillDetailByNameQueryKey = (
  skillName: string | undefined,
  version?: number
) => ["skills", "detail-by-name", skillName, version] as const;

export const latestSkillByNameQueryKey = (skillName: string | undefined) =>
  ["skills", "latest-by-name", skillName] as const;

export const skillVersionsQueryKey = (skillId: number | undefined) =>
  ["skills", "versions", skillId] as const;

export const skillFileQueryKey = (
  skillId: number | undefined,
  version: number | undefined,
  path: string | undefined
) => ["skills", "file", skillId, version, path] as const;

export const skillFileQueryPrefix = (skillId: number | undefined) =>
  ["skills", "file", skillId] as const;

export const originDiscoveryQueryKey = (originKey: string | undefined) =>
  ["origins", "discover", originKey] as const;

export const originDefinitionQueryKey = (
  originKey: string | undefined,
  skillName: string | undefined
) => ["origins", "definitions", originKey, skillName] as const;
