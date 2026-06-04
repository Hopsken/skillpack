export type DraftMode = "edit" | "view";
export type FileDraftStatus =
  | "added"
  | "clean"
  | "deleted"
  | "modified"
  | "renamed";

export interface ResourceDraftSession {
  addedPaths: Set<string>;
  deletedPaths: Set<string>;
  descriptionDraft?: string;
  draftsByPath: Record<string, string>;
  mode: DraftMode;
  renamedFromByPath: Record<string, string>;
}

export const createResourceDraftSession = (
  input: Partial<ResourceDraftSession> = {}
): ResourceDraftSession => ({
  addedPaths: input.addedPaths ?? new Set(),
  deletedPaths: input.deletedPaths ?? new Set(),
  descriptionDraft: input.descriptionDraft,
  draftsByPath: input.draftsByPath ?? {},
  mode: input.mode ?? "view",
  renamedFromByPath: input.renamedFromByPath ?? {},
});

export const getFileStatus = (
  path: string,
  session: ResourceDraftSession
): FileDraftStatus => {
  if (session.addedPaths.has(path) && session.deletedPaths.has(path)) {
    return "clean";
  }

  if (session.deletedPaths.has(path)) {
    return "deleted";
  }

  if (Object.hasOwn(session.renamedFromByPath, path)) {
    return "renamed";
  }

  if (session.addedPaths.has(path)) {
    return "added";
  }

  if (Object.hasOwn(session.draftsByPath, path)) {
    return "modified";
  }

  return "clean";
};

export const getChangeCount = (session: ResourceDraftSession) => {
  const changedPaths = new Set<string>();

  for (const path of Object.keys(session.draftsByPath)) {
    if (!session.deletedPaths.has(path)) {
      changedPaths.add(path);
    }
  }

  for (const path of session.deletedPaths) {
    if (!session.addedPaths.has(path)) {
      changedPaths.add(path);
    }
  }

  for (const [nextPath, previousPath] of Object.entries(
    session.renamedFromByPath
  )) {
    changedPaths.delete(nextPath);
    changedPaths.delete(previousPath);
    changedPaths.add(`${previousPath}\0${nextPath}`);
  }

  if (session.descriptionDraft !== undefined) {
    changedPaths.add("description");
  }

  return changedPaths.size;
};
