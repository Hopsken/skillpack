import { z } from "zod";

import { skillDescriptionSchema, skillNameSchema } from "../primitives";
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

export type DiscoverSkillsResponse = z.infer<
  typeof discoverSkillsResponseSchema
>;
export type OriginSkillCandidate = z.infer<typeof originSkillCandidateSchema>;
export type ResolvedSkillOrigin = z.infer<typeof resolvedSkillOriginSchema>;
