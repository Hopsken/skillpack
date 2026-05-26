import {
  optionalSkillChangeSummarySchema,
  optionalSkillVersionLabelSchema,
  safeRelativePathSchema,
  skillDescriptionSchema,
  skillNameSchema,
} from "@skillpack/core/primitives";
import { z } from "zod";

import { originSelectionSchema, skillOriginSchema } from "../origins/requests";

const createSkillResourceSchema = z.object({
  content: z.string(),
  mediaType: z.string().min(1).optional(),
  path: safeRelativePathSchema,
});

export const createSkillSchema = z.object({
  changeSummary: optionalSkillChangeSummarySchema,
  content: z.string().min(1),
  description: skillDescriptionSchema,
  name: skillNameSchema,
  resources: z.array(createSkillResourceSchema).default([]),
  versionLabel: optionalSkillVersionLabelSchema,
});

export const patchSkillSchema = z.object({
  changeSummary: optionalSkillChangeSummarySchema,
  content: z.string().min(1).optional(),
  deleteResourcePaths: z.array(safeRelativePathSchema).default([]),
  description: skillDescriptionSchema.optional(),
  name: skillNameSchema.optional(),
  upsertResources: z.array(createSkillResourceSchema).default([]),
  versionLabel: optionalSkillVersionLabelSchema,
});

export const restoreVersionSchema = z.object({
  changeSummary: optionalSkillChangeSummarySchema,
  versionLabel: optionalSkillVersionLabelSchema,
});

export const forkSkillSchema = z.object({
  origin: skillOriginSchema,
  selections: z.array(originSelectionSchema).min(1),
  versionLabel: optionalSkillVersionLabelSchema,
});

export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type ForkSkillInput = z.infer<typeof forkSkillSchema>;
export type PatchSkillInput = z.infer<typeof patchSkillSchema>;
export type RestoreVersionInput = z.infer<typeof restoreVersionSchema>;
