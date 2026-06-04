import type { PatchSkillInput } from "@skillpack/contracts/skills/requests";
import { safeRelativePathSchema } from "@skillpack/core/primitives";

export const skillFilePath = "SKILL.md";

interface DraftFileInfo {
  mediaType: string;
  path: string;
}

interface BuildResourcePatchInputParams {
  deletedPaths: Set<string>;
  descriptionDraft?: string;
  draftsByPath: Record<string, string>;
  filesByPath: Map<string, DraftFileInfo>;
  renamedFromByPath?: Record<string, string>;
}

const extensionMediaTypes = new Map<string, string>([
  ["bash", "text/x-shellscript"],
  ["cjs", "text/javascript"],
  ["js", "text/javascript"],
  ["json", "application/json"],
  ["jsx", "text/javascript"],
  ["md", "text/markdown"],
  ["mjs", "text/javascript"],
  ["py", "text/x-python"],
  ["sh", "text/x-shellscript"],
  ["ts", "application/typescript"],
  ["tsx", "application/typescript"],
  ["txt", "text/plain"],
  ["yaml", "application/yaml"],
  ["yml", "application/yaml"],
]);

const getExtension = (path: string) =>
  path.split(".").pop()?.toLowerCase() ?? "";

export const getTextResourceMediaType = (path: string) =>
  extensionMediaTypes.get(getExtension(path)) ?? "text/plain";

export const validateNewResourcePath = (
  path: string,
  existingPaths: Set<string>
) => {
  const parsed = safeRelativePathSchema.safeParse(path);

  if (!parsed.success) {
    return parsed.error.issues.at(0)?.message ?? "Invalid file path";
  }

  if (path === skillFilePath) {
    return "SKILL.md is reserved";
  }

  if (existingPaths.has(path)) {
    return "File already exists";
  }

  return null;
};

const getPatchChangeCount = ({
  deletedPaths,
  descriptionDraft,
  draftsByPath,
  renamedFromByPath = {},
}: Pick<
  BuildResourcePatchInputParams,
  "deletedPaths" | "descriptionDraft" | "draftsByPath" | "renamedFromByPath"
>) => {
  const changedPaths = new Set<string>(
    Object.keys(draftsByPath).filter((path) => !deletedPaths.has(path))
  );

  for (const path of deletedPaths) {
    if (path !== skillFilePath) {
      changedPaths.add(path);
    }
  }

  for (const [nextPath, previousPath] of Object.entries(renamedFromByPath)) {
    changedPaths.delete(nextPath);
    changedPaths.delete(previousPath);
    changedPaths.add(`${previousPath}\0${nextPath}`);
  }

  if (descriptionDraft !== undefined) {
    changedPaths.add("description");
  }

  return changedPaths.size;
};

export const buildResourcePatchInput = ({
  deletedPaths,
  descriptionDraft,
  draftsByPath,
  filesByPath,
  renamedFromByPath = {},
}: BuildResourcePatchInputParams): PatchSkillInput => {
  const upsertResources: NonNullable<PatchSkillInput["upsertResources"]> = [];
  const deleteResourcePaths = [...deletedPaths].filter(
    (path) => path !== skillFilePath
  );
  const changeCount = getPatchChangeCount({
    deletedPaths,
    descriptionDraft,
    draftsByPath,
    renamedFromByPath,
  });
  const input: PatchSkillInput = {
    changeSummary:
      changeCount === 1 ? "Edit 1 item" : `Edit ${changeCount} items`,
    deleteResourcePaths,
    upsertResources,
  };

  for (const [path, content] of Object.entries(draftsByPath)) {
    if (deletedPaths.has(path)) {
      continue;
    }

    if (path === skillFilePath) {
      input.content = content;
      continue;
    }

    upsertResources.push({
      content,
      mediaType:
        filesByPath.get(path)?.mediaType ?? getTextResourceMediaType(path),
      path,
    });
  }

  if (descriptionDraft !== undefined) {
    input.description = descriptionDraft;
  }

  return input;
};
