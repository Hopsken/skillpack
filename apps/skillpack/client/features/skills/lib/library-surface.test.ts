import { describe, expect, it } from "vitest";

import {
  getEmptyLibraryActions,
  getLibraryActions,
  getManagedSkillsSummary,
} from "./library-surface";

describe("library surface helpers", () => {
  it("makes Add to Library the primary library action", () => {
    expect(getLibraryActions()).toStrictEqual([
      {
        kind: "primary",
        label: "Add to Library",
        to: "/add-skill",
      },
      {
        kind: "secondary",
        label: "Create Skill",
        to: "/create-skill",
      },
    ]);
  });

  it("teaches both acquisition paths in the empty state", () => {
    expect(getEmptyLibraryActions()).toStrictEqual([
      {
        kind: "primary",
        label: "Add to Library",
        to: "/add-skill",
      },
      {
        kind: "secondary",
        label: "Create your first skill",
        to: "/create-skill",
      },
    ]);
  });

  it("describes the managed skill count with product copy", () => {
    expect(getManagedSkillsSummary(0)).toBe("No managed skills yet");
    expect(getManagedSkillsSummary(1)).toBe("1 managed skill");
    expect(getManagedSkillsSummary(3)).toBe("3 managed skills");
  });
});
