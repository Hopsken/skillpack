import { z } from "zod";

export const skillIdSchema = z.coerce.number().int().positive();
export const skillVersionNumberSchema = z.coerce.number().int().positive();

export const skillNameSchema = z.string().min(1).max(80);
export const skillDescriptionSchema = z.string().min(1).max(500);
export const skillVersionLabelSchema = z.string().min(1).max(80);
export const skillChangeSummarySchema = z.string().min(1).max(500);

export const optionalSkillVersionLabelSchema =
  skillVersionLabelSchema.optional();
export const optionalSkillChangeSummarySchema =
  skillChangeSummarySchema.optional();

const isSafeRelativePath = (path: string) =>
  !path.startsWith("/") &&
  !path.includes("\\") &&
  path.split("/").every((part) => part && part !== "." && part !== "..");

export const safeRelativePathSchema = z
  .string()
  .min(1)
  .max(240)
  .refine(isSafeRelativePath, "Path must be a safe relative path");
