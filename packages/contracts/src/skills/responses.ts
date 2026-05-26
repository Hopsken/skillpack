import {
  safeRelativePathSchema,
  skillAllowedToolsSchema,
  skillCompatibilitySchema,
  skillDescriptionSchema,
  skillIdSchema,
  skillLicenseSchema,
  skillMetadataSchema,
  skillNameSchema,
  skillVersionNumberSchema,
} from "@skillpack/core/primitives";
import { z } from "zod";

import { originSelectionSchema } from "../origins/requests";

const skillOriginSummarySchema = z.object({
  kind: z.literal("github"),
  metadata: z.record(z.unknown()).nullable(),
  url: z.string().url(),
});

export const resourceManifestItemSchema = z.object({
  mediaType: z.string().min(1),
  path: safeRelativePathSchema,
  sha256: z.string().min(1),
  size: z.number().int().nonnegative(),
});

export const skillListItemSchema = z.object({
  allowedTools: skillAllowedToolsSchema.nullable(),
  compatibility: skillCompatibilitySchema.nullable(),
  createdAt: z.string().datetime(),
  currentVersion: skillVersionNumberSchema,
  description: skillDescriptionSchema,
  id: skillIdSchema,
  license: skillLicenseSchema.nullable(),
  metadata: skillMetadataSchema.nullable(),
  name: skillNameSchema,
  origin: skillOriginSummarySchema.optional(),
  updatedAt: z.string().datetime(),
});

export const skillListResponseSchema = z.object({
  skills: z.array(skillListItemSchema),
});

export const resolvedSkillSchema = z.object({
  allowedTools: skillAllowedToolsSchema.nullable(),
  compatibility: skillCompatibilitySchema.nullable(),
  content: z.string(),
  createdAt: z.string().datetime(),
  description: skillDescriptionSchema,
  id: skillIdSchema,
  license: skillLicenseSchema.nullable(),
  metadata: skillMetadataSchema.nullable(),
  name: skillNameSchema,
  origin: skillOriginSummarySchema.optional(),
  resources: z.array(resourceManifestItemSchema),
  updatedAt: z.string().datetime(),
  version: skillVersionNumberSchema,
  versionLabel: z.string().nullable(),
});

export const skillVersionItemSchema = z.object({
  allowedTools: skillAllowedToolsSchema.nullable(),
  changeSummary: z.string().nullable(),
  compatibility: skillCompatibilitySchema.nullable(),
  createdAt: z.string().datetime(),
  description: skillDescriptionSchema,
  label: z.string().nullable(),
  license: skillLicenseSchema.nullable(),
  metadata: skillMetadataSchema.nullable(),
  name: skillNameSchema,
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
  path: safeRelativePathSchema,
  sha256: z.string().min(1),
  size: z.number().int().nonnegative(),
  version: skillVersionNumberSchema,
});

export const skillPatchedResponseSchema = z.object({
  allowedTools: skillAllowedToolsSchema.nullable(),
  compatibility: skillCompatibilitySchema.nullable(),
  currentVersion: skillVersionNumberSchema,
  description: skillDescriptionSchema,
  id: skillIdSchema,
  license: skillLicenseSchema.nullable(),
  metadata: skillMetadataSchema.nullable(),
  name: skillNameSchema,
});

export const restoreVersionResponseSchema = z.object({
  currentVersion: skillVersionNumberSchema,
  id: skillIdSchema,
  restoredFromVersion: skillVersionNumberSchema,
});

export const forkSkillResultSchema = z.discriminatedUnion("status", [
  z.object({
    selection: originSelectionSchema,
    skill: skillListItemSchema,
    status: z.literal("forked"),
  }),
  z.object({
    error: z.string().min(1),
    selection: originSelectionSchema,
    status: z.literal("failed"),
  }),
]);

export const forkSkillResponseSchema = z.object({
  results: z.array(forkSkillResultSchema),
});

export type ForkSkillResponse = z.infer<typeof forkSkillResponseSchema>;
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
