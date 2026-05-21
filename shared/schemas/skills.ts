import { z } from "zod";

export const skillNameSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/);

export const skillVersionSchema = z.string().min(1).max(32);

export const skillCatalogItemSchema = z.object({
  name: skillNameSchema,
  description: z.string().min(1),
  location: z.string().url().or(z.string().startsWith("skill://")),
  version: skillVersionSchema
});

export const skillCatalogResponseSchema = z.object({
  skills: z.array(skillCatalogItemSchema)
});

export const skillResourceSchema = z.object({
  path: z.string().min(1),
  mediaType: z.string().min(1),
  sha256: z.string().min(1),
  size: z.number().int().nonnegative()
});

export const skillReadResponseSchema = skillCatalogItemSchema.extend({
  content: z.string(),
  resources: z.array(skillResourceSchema)
});

export const createSkillSchema = z.object({
  name: skillNameSchema,
  description: z.string().min(1).max(500),
  version: skillVersionSchema.default("0.1.0"),
  content: z.string().min(1)
});

export type SkillCatalogItem = z.infer<typeof skillCatalogItemSchema>;
export type SkillCatalogResponse = z.infer<typeof skillCatalogResponseSchema>;
export type SkillReadResponse = z.infer<typeof skillReadResponseSchema>;
export type CreateSkillInput = z.infer<typeof createSkillSchema>;
