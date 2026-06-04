import { describe, expect, it } from "vitest";

import {
  createResourceDraftSession,
  getChangeCount,
  getFileStatus,
} from "./resource-draft-session";

describe("resource draft session", () => {
  it("starts in view mode with no changes", () => {
    const session = createResourceDraftSession();

    expect(session.mode).toBe("view");
    expect(getChangeCount(session)).toBe(0);
  });

  it("counts modified, added, and deleted files", () => {
    const session = createResourceDraftSession({
      addedPaths: new Set(["references/new.md"]),
      deletedPaths: new Set(["references/old.md"]),
      draftsByPath: {
        "SKILL.md": "# Updated\n",
        "references/new.md": "new",
      },
    });

    expect(getChangeCount(session)).toBe(3);
    expect(getFileStatus("SKILL.md", session)).toBe("modified");
    expect(getFileStatus("references/new.md", session)).toBe("added");
    expect(getFileStatus("references/old.md", session)).toBe("deleted");
    expect(getFileStatus("references/other.md", session)).toBe("clean");
  });

  it("counts description drafts and renames", () => {
    const session = createResourceDraftSession({
      addedPaths: new Set(["references/new.md"]),
      deletedPaths: new Set(["references/old.md"]),
      descriptionDraft: "Updated description",
      draftsByPath: {
        "references/new.md": "content",
      },
      renamedFromByPath: {
        "references/new.md": "references/old.md",
      },
    });

    expect(getChangeCount(session)).toBe(2);
    expect(getFileStatus("references/new.md", session)).toBe("renamed");
  });

  it("does not count a deleted added file", () => {
    const session = createResourceDraftSession({
      addedPaths: new Set(["references/new.md"]),
      deletedPaths: new Set(["references/new.md"]),
      draftsByPath: {
        "references/new.md": "new",
      },
    });

    expect(getChangeCount(session)).toBe(0);
  });
});
