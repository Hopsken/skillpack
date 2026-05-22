import { z } from "zod";

export const skillNameSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/u);

export const skillVersionSchema = z.string().min(1).max(32);

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
  path: z.string().min(1),
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
  path: z.string().min(1),
  sha256: z.string().min(1),
  version: skillVersionSchema,
});

export const createSkillSchema = z.object({
  content: z.string().min(1),
  description: z.string().min(1).max(500),
  name: skillNameSchema,
  version: skillVersionSchema.default("0.1.0"),
});

export type SkillCatalogItem = z.infer<typeof skillCatalogItemSchema>;
export type SkillCatalogResponse = z.infer<typeof skillCatalogResponseSchema>;
export type SkillReadResponse = z.infer<typeof skillReadResponseSchema>;
export type SkillResource = z.infer<typeof skillResourceSchema>;
export type SkillVersionItem = z.infer<typeof skillVersionItemSchema>;
export type SkillVersionsResponse = z.infer<typeof skillVersionsResponseSchema>;
export type SkillFileResponse = z.infer<typeof skillFileResponseSchema>;
export type CreateSkillInput = z.infer<typeof createSkillSchema>;
