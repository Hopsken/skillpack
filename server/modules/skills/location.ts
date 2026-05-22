import { skillNameSchema, skillSourceTypeSchema } from "@shared/schemas/skills";

import { skillErrors } from "./errors";
import type { SkillLocationInput } from "./types";

export const skillpackSourceType = "skillpack";
export const skillContentPath = "SKILL.md";

export const buildSkillpackLocation = (handle: string) =>
  `skill://skillpack/${handle}`;

export const buildSkillpackResolvedLocation = (
  handle: string,
  version: string
) => `${buildSkillpackLocation(handle)}?version=${encodeURIComponent(version)}`;

export const parseSkillLocationInput = (
  sourceType: string,
  locator: string
): SkillLocationInput => {
  const sourceResult = skillSourceTypeSchema.safeParse(sourceType);

  if (!sourceResult.success) {
    throw skillErrors.unsupportedSourceType();
  }

  if (sourceResult.data !== skillpackSourceType) {
    throw skillErrors.unsupportedSourceType();
  }

  const handleResult = skillNameSchema.safeParse(locator);

  if (!handleResult.success) {
    throw skillErrors.invalidSkillLocator();
  }

  return {
    handle: handleResult.data,
    sourceType: sourceResult.data,
  };
};
