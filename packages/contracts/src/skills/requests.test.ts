import {
  forkSkillSchema,
  patchSkillSchema,
} from "@skillpack/contracts/skills/requests";
import { skillNameSchema } from "@skillpack/core/primitives";
import { describe, expect, it } from "vitest";

describe("skill request contracts", () => {
  it("does not allow PATCH to rename a skill", () => {
    const result = patchSkillSchema.safeParse({
      deleteResourcePaths: [],
      description: "Updated description",
      name: "renamed",
      upsertResources: [],
    });

    expect(result.success).toBeFalsy();
  });

  it("rejects duplicate selections in one fork request", () => {
    const result = forkSkillSchema.safeParse({
      origin: { kind: "github", repoUrl: "https://github.com/example/skills" },
      selections: [{ skillName: "demo" }, { skillName: "demo" }],
    });

    expect(result.success).toBeFalsy();
  });

  it("reserves pure numeric Skill Names for ID route resolution", () => {
    expect(skillNameSchema.safeParse("123").success).toBeFalsy();
    expect(skillNameSchema.safeParse("demo-123").success).toBeTruthy();
  });
});
