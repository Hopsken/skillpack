import { describe, expect, it } from "vitest";

import { addSkillPath, createSkillPath, getSkillDetailPath } from "./routes";

describe("skill frontend routes", () => {
  it("keeps skill details under the skill name and actions outside /skills", () => {
    expect(getSkillDetailPath("demo-skill")).toBe("/skills/demo-skill");
    expect(getSkillDetailPath("new")).toBe("/skills/new");
    expect(getSkillDetailPath("fork")).toBe("/skills/fork");
    expect(createSkillPath).toBe("/create-skill");
    expect(addSkillPath).toBe("/add-skill");
  });
});
