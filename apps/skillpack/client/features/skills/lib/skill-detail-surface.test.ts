import { describe, expect, it } from "vitest";

import {
  getDetailFileSwitcherLabel,
  getDetailHeaderStatus,
} from "./skill-detail-surface";

describe("skill detail surface helpers", () => {
  it("uses the selected file path in the mobile file switcher label", () => {
    expect(getDetailFileSwitcherLabel()).toBe("Files · SKILL.md");
    expect(getDetailFileSwitcherLabel("resources/notes.md")).toBe(
      "Files · resources/notes.md"
    );
  });

  it("summarizes editing state in product copy", () => {
    expect(
      getDetailHeaderStatus({
        changeCount: 0,
        isEditing: false,
        isSaving: false,
        saveStatus: "No changes",
        version: 3,
      })
    ).toBe("Version 3");

    expect(
      getDetailHeaderStatus({
        changeCount: 2,
        isEditing: true,
        isSaving: false,
        saveStatus: "Unsaved changes",
        version: 3,
      })
    ).toBe("2 unsaved changes");
  });
});
