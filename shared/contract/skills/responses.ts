import { z } from "zod";

const skillIdSchema = z.coerce.number().int().positive();
const skillVersionNumberSchema = z.coerce.number().int().positive();

const skillNameSchema = z.string().min(1).max(80);
const skillDescriptionSchema = z.string().min(1).max(500);

const isSafeRelativePath = (path: string) =>
  !path.startsWith("/") &&
  !path.includes("\\") &&
  path.split("/").every((part) => part && part !== "." && part !== "..");

const skillResourcePathSchema = z
  .string()
  .min(1)
  .max(240)
  .refine(isSafeRelativePath, "Path must be a safe relative path");

const skillOriginSummarySchema = z.object({
  kind: z.literal("github"),
  metadata: z.record(z.unknown()).nullable(),
  url: z.string().url(),
});

export const resourceManifestItemSchema = z.object({
  mediaType: z.string().min(1),
  path: skillResourcePathSchema,
  sha256: z.string().min(1),
  size: z.number().int().nonnegative(),
});

export const skillListItemSchema = z.object({
  createdAt: z.string().datetime(),
  currentVersion: skillVersionNumberSchema,
  description: skillDescriptionSchema,
  id: skillIdSchema,
  name: skillNameSchema,
  origin: skillOriginSummarySchema.optional(),
  updatedAt: z.string().datetime(),
});

export const skillListResponseSchema = z.object({
  skills: z.array(skillListItemSchema),
});

export const resolvedSkillSchema = z.object({
  content: z.string(),
  createdAt: z.string().datetime(),
  description: skillDescriptionSchema,
  id: skillIdSchema,
  name: skillNameSchema,
  origin: skillOriginSummarySchema.optional(),
  resources: z.array(resourceManifestItemSchema),
  updatedAt: z.string().datetime(),
  version: skillVersionNumberSchema,
  versionLabel: z.string().nullable(),
});

export const skillVersionItemSchema = z.object({
  changeSummary: z.string().nullable(),
  createdAt: z.string().datetime(),
  description: skillDescriptionSchema,
  label: z.string().nullable(),
  version: skillVersionNumberSchema,
});

export const skillVersionListResponseSchema = z.object({
  currentVersion: skillVersionNumberSchema,
  id: skillIdSchema,
  name: skillNameSchema,
  versions: z.array(skillVersionItemSchema),
});

export const skillResourceResponseSchema = z.object({
  content: z.string(),
  mediaType: z.string().min(1),
  path: skillResourcePathSchema,
  sha256: z.string().min(1),
  size: z.number().int().nonnegative(),
  version: skillVersionNumberSchema,
});

export const skillPatchedResponseSchema = z.object({
  currentVersion: skillVersionNumberSchema,
  description: skillDescriptionSchema,
  id: skillIdSchema,
  name: skillNameSchema,
});

export const restoreVersionResponseSchema = z.object({
  currentVersion: skillVersionNumberSchema,
  id: skillIdSchema,
  restoredFromVersion: skillVersionNumberSchema,
});

export type ResolvedSkill = z.infer<typeof resolvedSkillSchema>;
export type ResourceManifestItem = z.infer<typeof resourceManifestItemSchema>;
export type SkillListItem = z.infer<typeof skillListItemSchema>;
export type SkillListResponse = z.infer<typeof skillListResponseSchema>;
export type SkillPatchedResponse = z.infer<typeof skillPatchedResponseSchema>;
export type SkillResourceResponse = z.infer<typeof skillResourceResponseSchema>;
export type SkillVersionItem = z.infer<typeof skillVersionItemSchema>;
export type SkillVersionListResponse = z.infer<
  typeof skillVersionListResponseSchema
>;
