import { z } from "zod";

export const skillIdSchema = z.coerce.number().int().positive();
export const skillVersionNumberSchema = z.coerce.number().int().positive();

export const skillNameSchema = z.string().min(1).max(80);
export const skillDescriptionSchema = z.string().min(1).max(500);
export const skillVersionLabelSchema = z.string().min(1).max(80).optional();
export const skillChangeSummarySchema = z.string().min(1).max(500).optional();

const isSafeRelativePath = (path: string) =>
  !path.startsWith("/") &&
  !path.includes("\\") &&
  path.split("/").every((part) => part && part !== "." && part !== "..");

export const skillResourcePathSchema = z
  .string()
  .min(1)
  .max(240)
  .refine(isSafeRelativePath, "Path must be a safe relative path");
