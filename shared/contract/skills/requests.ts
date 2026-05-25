import { z } from "zod";

import { originSelectionSchema, skillOriginSchema } from "../origins/requests";

const skillNameSchema = z.string().min(1).max(80);
const skillDescriptionSchema = z.string().min(1).max(500);
const skillVersionLabelSchema = z.string().min(1).max(80).optional();
const skillChangeSummarySchema = z.string().min(1).max(500).optional();

const isSafeRelativePath = (path: string) =>
  !path.startsWith("/") &&
  !path.includes("\\") &&
  path.split("/").every((part) => part && part !== "." && part !== "..");

const skillResourcePathSchema = z
  .string()
  .min(1)
  .max(240)
  .refine(isSafeRelativePath, "Path must be a safe relative path");

const createSkillResourceSchema = z.object({
  content: z.string(),
  mediaType: z.string().min(1).optional(),
  path: skillResourcePathSchema,
});

export const createSkillSchema = z.object({
  changeSummary: skillChangeSummarySchema,
  content: z.string().min(1),
  description: skillDescriptionSchema,
  name: skillNameSchema,
  resources: z.array(createSkillResourceSchema).default([]),
  versionLabel: skillVersionLabelSchema,
});

export const patchSkillSchema = z.object({
  changeSummary: skillChangeSummarySchema,
  content: z.string().min(1).optional(),
  deleteResourcePaths: z.array(skillResourcePathSchema).default([]),
  description: skillDescriptionSchema.optional(),
  name: skillNameSchema.optional(),
  upsertResources: z.array(createSkillResourceSchema).default([]),
  versionLabel: skillVersionLabelSchema,
});

export const restoreVersionSchema = z.object({
  changeSummary: skillChangeSummarySchema,
  versionLabel: skillVersionLabelSchema,
});

export const forkSkillSchema = z.object({
  origin: skillOriginSchema,
  selections: z.array(originSelectionSchema).min(1),
  versionLabel: skillVersionLabelSchema,
});

export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type ForkSkillInput = z.infer<typeof forkSkillSchema>;
export type PatchSkillInput = z.infer<typeof patchSkillSchema>;
export type RestoreVersionInput = z.infer<typeof restoreVersionSchema>;
