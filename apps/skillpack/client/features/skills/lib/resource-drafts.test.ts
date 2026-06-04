import { describe, expect, it } from "vitest";

import {
  buildResourcePatchInput,
  getTextResourceMediaType,
  validateNewResourcePath,
} from "./resource-drafts";

describe("resource draft helpers", () => {
  it("validates new resource paths", () => {
    const existingPaths = new Set(["SKILL.md", "references/notes.md"]);

    expect(
      validateNewResourcePath("references/new.md", existingPaths)
    ).toBeNull();
    expect(validateNewResourcePath("/bad.md", existingPaths)).toBe(
      "Path must be a safe relative path"
    );
    expect(validateNewResourcePath("SKILL.md", existingPaths)).toBe(
      "SKILL.md is reserved"
    );
    expect(validateNewResourcePath("references/notes.md", existingPaths)).toBe(
      "File already exists"
    );
  });

  it("infers simple text media types", () => {
    expect(getTextResourceMediaType("notes.md")).toBe("text/markdown");
    expect(getTextResourceMediaType("data.json")).toBe("application/json");
    expect({
      python: getTextResourceMediaType("scripts/run.py"),
      shell: getTextResourceMediaType("scripts/run.sh"),
      text: getTextResourceMediaType("references/plain.txt"),
      typescript: getTextResourceMediaType("scripts/run.ts"),
    }).toStrictEqual({
      python: "text/x-python",
      shell: "text/x-shellscript",
      text: "text/plain",
      typescript: "application/typescript",
    });
  });

  it("counts a rename as one changed item", () => {
    expect(
      buildResourcePatchInput({
        deletedPaths: new Set(["references/old.md"]),
        draftsByPath: {
          "references/new.md": "content",
        },
        filesByPath: new Map([
          [
            "references/new.md",
            { mediaType: "text/markdown", path: "references/new.md" },
          ],
        ]),
        renamedFromByPath: {
          "references/new.md": "references/old.md",
        },
      })
    ).toMatchObject({
      deleteResourcePaths: ["references/old.md"],
      upsertResources: [
        {
          content: "content",
          path: "references/new.md",
        },
      ],
    });
  });

  it("builds one patch input for skill content, upserts, and deletes", () => {
    expect(
      buildResourcePatchInput({
        deletedPaths: new Set(["references/old.md"]),
        descriptionDraft: "Updated description",
        draftsByPath: {
          "SKILL.md": "# Updated\n",
          "references/new.md": "new content",
        },
        filesByPath: new Map([
          ["SKILL.md", { mediaType: "text/markdown", path: "SKILL.md" }],
          [
            "references/new.md",
            { mediaType: "text/markdown", path: "references/new.md" },
          ],
        ]),
        skillNameDraft: "renamed-skill",
      })
    ).toStrictEqual({
      content: "# Updated\n",
      deleteResourcePaths: ["references/old.md"],
      description: "Updated description",
      name: "renamed-skill",
      upsertResources: [
        {
          content: "new content",
          mediaType: "text/markdown",
          path: "references/new.md",
        },
      ],
    });
  });
});
