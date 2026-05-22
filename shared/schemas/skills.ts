import { z } from "zod";

export const skillNameSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/u);

export const skillVersionSchema = z.string().min(1).max(32);

const isSafeRelativePath = (path: string) =>
  !path.startsWith("/") &&
  !path.includes("\\") &&
  path.split("/").every((part) => part && part !== "." && part !== "..");

export const skillResourcePathSchema = z
  .string()
  .min(1)
  .max(240)
  .refine(isSafeRelativePath, "Path must be a safe relative path");

export const skillCatalogItemSchema = z.object({
  description: z.string().min(1),
  location: z.string().url().or(z.string().startsWith("skill://")),
  name: skillNameSchema,
  version: skillVersionSchema,
});

export const skillCatalogResponseSchema = z.object({
  skills: z.array(skillCatalogItemSchema),
});

export const skillResourceSchema = z.object({
  mediaType: z.string().min(1),
  path: skillResourcePathSchema,
  sha256: z.string().min(1),
  size: z.number().int().nonnegative(),
});

export const skillReadResponseSchema = skillCatalogItemSchema.extend({
  content: z.string(),
  resources: z.array(skillResourceSchema),
});

export const skillVersionItemSchema = z.object({
  createdAt: z.string().datetime(),
  location: z.string().url().or(z.string().startsWith("skill://")),
  version: skillVersionSchema,
});

export const skillVersionsResponseSchema = z.object({
  name: skillNameSchema,
  versions: z.array(skillVersionItemSchema),
});

export const skillFileResponseSchema = z.object({
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
export type SkillCatalogItem = z.infer<typeof skillCatalogItemSchema>;
export type SkillCatalogResponse = z.infer<typeof skillCatalogResponseSchema>;
export type SkillReadResponse = z.infer<typeof skillReadResponseSchema>;
export type SkillResource = z.infer<typeof skillResourceSchema>;
export type SkillVersionItem = z.infer<typeof skillVersionItemSchema>;
export type SkillVersionsResponse = z.infer<typeof skillVersionsResponseSchema>;
export type SkillFileResponse = z.infer<typeof skillFileResponseSchema>;
export type CreateSkillInput = z.infer<typeof createSkillSchema>;
