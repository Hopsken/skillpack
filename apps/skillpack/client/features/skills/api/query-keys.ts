export const skillListQueryKey = ["skills", "list"] as const;
export const skillQueryPrefix = ["skills"] as const;

export const skillDetailQueryKey = (
  skillName: string | undefined,
  version?: number
) => ["skills", "detail", skillName, version] as const;

export const skillDetailQueryPrefix = (skillName: string | undefined) =>
  ["skills", "detail", skillName] as const;

export const latestSkillQueryKey = (skillName: string | undefined) =>
  ["skills", "latest", skillName] as const;

export const skillVersionsQueryKey = (skillName: string | undefined) =>
  ["skills", "versions", skillName] as const;

export const skillFileQueryKey = (
  skillName: string | undefined,
  version: number | undefined,
  path: string | undefined
) => ["skills", "file", skillName, version, path] as const;

export const skillFileQueryPrefix = (skillName: string | undefined) =>
  ["skills", "file", skillName] as const;

export const originDiscoveryQueryKey = (originKey: string | undefined) =>
  ["origins", "discover", originKey] as const;

export const originDefinitionQueryKey = (
  originKey: string | undefined,
  skillName: string | undefined
) => ["origins", "definitions", originKey, skillName] as const;
