import { skillNameSchema } from "@skillpack/core/primitives";
import { z } from "zod";

export const githubOriginSchema = z.object({
  branch: z.string().min(1).max(160).optional(),
  kind: z.literal("github"),
  repoUrl: z.string().url(),
  rev: z.string().min(1).max(160).optional(),
});

export const npmOriginSchema = z.object({
  kind: z.literal("npm"),
  packageName: z.string().min(1).max(214),
  version: z.string().min(1).max(160).optional(),
});

export const skillOriginSchema = z.discriminatedUnion("kind", [
  githubOriginSchema,
  npmOriginSchema,
]);

export const originSelectionSchema = z.object({
  skillName: skillNameSchema,
});

export const discoverSkillsSchema = z.object({
  origin: skillOriginSchema,
});

export const readSkillDefinitionsSchema = z.object({
  origin: skillOriginSchema,
  selections: z.array(originSelectionSchema).min(1),
});

export type DiscoverSkillsInput = z.infer<typeof discoverSkillsSchema>;
export type OriginSelectionInput = z.infer<typeof originSelectionSchema>;
export type ReadSkillDefinitionsInput = z.infer<
  typeof readSkillDefinitionsSchema
>;
export type SkillOriginInput = z.infer<typeof skillOriginSchema>;
