import type { ResourceManifestItem } from "@skillpack/contracts/skills/responses";

type SkillResourceKind = "code" | "image" | "markdown" | "text";

const extensionLanguages = new Map<string, string>([
  ["js", "javascript"],
  ["json", "json"],
  ["mjs", "javascript"],
  ["py", "python"],
  ["sh", "bash"],
  ["ts", "typescript"],
  ["tsx", "typescript"],
  ["yaml", "yaml"],
  ["yml", "yaml"],
]);

const imageExtensions = new Set(["gif", "jpeg", "jpg", "png", "webp"]);

const getExtension = (path: string) =>
  path.split(".").pop()?.toLowerCase() ?? "";

export const getSkillResourceKind = (
  resource: Pick<ResourceManifestItem, "mediaType" | "path">
): SkillResourceKind => {
  const extension = getExtension(resource.path);

  if (
    resource.mediaType.startsWith("image/") ||
    imageExtensions.has(extension)
  ) {
    return "image";
  }

  if (resource.mediaType.includes("markdown") || extension === "md") {
    return "markdown";
  }

  if (
    extensionLanguages.has(extension) ||
    resource.path.startsWith("scripts/")
  ) {
    return "code";
  }

  return "text";
};

export const getSkillResourceLanguage = (path: string) => {
  const extension = getExtension(path);
  return extensionLanguages.get(extension) ?? "text";
};
