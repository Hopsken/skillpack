import { z } from "zod";

export const skillNameSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/u);

export const skillVersionSchema = z.string().min(1).max(32);
export const skillSourceTypeSchema = z.enum(["skillpack", "github", "npm"]);
export const skillTrustStatusSchema = z.enum(["approved"]);

export const skillLocationSchema = z
  .string()
  .min(1)
  .max(240)
  .startsWith("skill://");

const isSafeRelativePath = (path: string) =>
  !path.startsWith("/") &&
  !path.includes("\\") &&
  path.split("/").every((part) => part && part !== "." && part !== "..");

export const skillResourcePathSchema = z
  .string()
  .min(1)
  .max(240)
  .refine(isSafeRelativePath, "Path must be a safe relative path");

export const skillSourceSchema = z.object({
  type: skillSourceTypeSchema,
});

export const skillTrustSchema = z.object({
  approvedAt: z.string().datetime(),
  status: skillTrustStatusSchema,
});

export const resourceManifestItemSchema = z.object({
  mediaType: z.string().min(1),
  path: skillResourcePathSchema,
  sha256: z.string().min(1),
  size: z.number().int().nonnegative(),
});

export const skillListItemSchema = z.object({
  description: z.string().min(1),
  handle: skillNameSchema,
  location: skillLocationSchema,
  name: skillNameSchema,
  source: skillSourceSchema,
  trust: skillTrustSchema,
  version: skillVersionSchema,
});

export const skillListResponseSchema = z.object({
  skills: z.array(skillListItemSchema),
});

export const resolvedSkillSchema = skillListItemSchema.extend({
  content: z.string(),
  resolvedLocation: skillLocationSchema,
  resources: z.array(resourceManifestItemSchema),
});

export const skillVersionItemSchema = z.object({
  createdAt: z.string().datetime(),
  location: skillLocationSchema,
  resolvedLocation: skillLocationSchema,
  trust: skillTrustSchema,
  version: skillVersionSchema,
});

export const skillVersionListResponseSchema = z.object({
  handle: skillNameSchema,
  location: skillLocationSchema,
  name: skillNameSchema,
  versions: z.array(skillVersionItemSchema),
});

export const skillResourceResponseSchema = z.object({
  content: z.string(),
  mediaType: z.string().min(1),
  path: skillResourcePathSchema,
  sha256: z.string().min(1),
  size: z.number().int().nonnegative(),
  version: skillVersionSchema,
});

export const createSkillResourceSchema = z.object({
  content: z.string(),
  mediaType: z.string().min(1).optional(),
  path: skillResourcePathSchema,
});

export const createSkillSchema = z.object({
  content: z.string().min(1),
  description: z.string().min(1).max(500),
  name: skillNameSchema,
  resources: z.array(createSkillResourceSchema).default([]),
  version: skillVersionSchema.default("0.1.0"),
});

export type CreateSkillResourceInput = z.infer<
  typeof createSkillResourceSchema
>;
export type ResourceManifestItem = z.infer<typeof resourceManifestItemSchema>;
export type ResolvedSkill = z.infer<typeof resolvedSkillSchema>;
export type SkillListItem = z.infer<typeof skillListItemSchema>;
export type SkillListResponse = z.infer<typeof skillListResponseSchema>;
export type SkillResourceResponse = z.infer<typeof skillResourceResponseSchema>;
export type SkillSource = z.infer<typeof skillSourceSchema>;
export type SkillSourceType = z.infer<typeof skillSourceTypeSchema>;
export type SkillTrust = z.infer<typeof skillTrustSchema>;
export type SkillVersionItem = z.infer<typeof skillVersionItemSchema>;
export type SkillVersionListResponse = z.infer<
  typeof skillVersionListResponseSchema
>;
export type CreateSkillInput = z.infer<typeof createSkillSchema>;
