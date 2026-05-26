import { z } from "zod";

import {
  safeRelativePathSchema,
  skillDescriptionSchema,
  skillNameSchema,
} from "../primitives";
import { originSelectionSchema, skillOriginSchema } from "./requests";

export const originSkillCandidateSchema = z.object({
  description: skillDescriptionSchema.optional(),
  name: skillNameSchema,
  path: z.string().min(1).max(500).optional(),
  selection: originSelectionSchema,
});

export const resolvedGithubOriginSchema = z.object({
  branch: z.string().min(1),
  kind: z.literal("github"),
  repoUrl: z.string().url(),
  rev: z.string().min(1),
});

export const resolvedNpmOriginSchema = z.object({
  kind: z.literal("npm"),
  packageName: z.string().min(1),
  version: z.string().min(1),
});

export const resolvedSkillOriginSchema = z.discriminatedUnion("kind", [
  resolvedGithubOriginSchema,
  resolvedNpmOriginSchema,
]);

export const discoverSkillsResponseSchema = z.object({
  candidates: z.array(originSkillCandidateSchema),
  origin: skillOriginSchema,
  resolvedOrigin: resolvedSkillOriginSchema,
});

export const originDefinitionResourceSchema = z.object({
  content: z.string(),
  mediaType: z.string().min(1),
  path: safeRelativePathSchema,
  size: z.number().int().nonnegative(),
});

export const originSkillDefinitionSchema = z.object({
  content: z.string(),
  description: skillDescriptionSchema,
  name: skillNameSchema,
  resources: z.array(originDefinitionResourceSchema),
  selection: originSelectionSchema,
});

export const readSkillDefinitionsResultSchema = z.discriminatedUnion("status", [
  z.object({
    definition: originSkillDefinitionSchema,
    status: z.literal("resolved"),
  }),
  z.object({
    error: z.string().min(1),
    selection: originSelectionSchema,
    status: z.literal("failed"),
  }),
]);

export const readSkillDefinitionsResponseSchema = z.object({
  results: z.array(readSkillDefinitionsResultSchema),
});

export type DiscoverSkillsResponse = z.infer<
  typeof discoverSkillsResponseSchema
>;
export type OriginDefinitionResource = z.infer<
  typeof originDefinitionResourceSchema
>;
export type OriginSkillDefinitionPreview = z.infer<
  typeof originSkillDefinitionSchema
>;
export type OriginSkillCandidate = z.infer<typeof originSkillCandidateSchema>;
export type ReadSkillDefinitionsResponse = z.infer<
  typeof readSkillDefinitionsResponseSchema
>;
export type ResolvedSkillOrigin = z.infer<typeof resolvedSkillOriginSchema>;
