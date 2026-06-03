import {
  forkSkillSchema,
  patchSkillSchema,
} from "@skillpack/contracts/skills/requests";
import { skillListItemSchema } from "@skillpack/contracts/skills/responses";
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

  it("reserves pure numeric values so they cannot become Skill Names", () => {
    expect(skillNameSchema.safeParse("123").success).toBeFalsy();
    expect(skillNameSchema.safeParse("demo-123").success).toBeTruthy();
  });

  it("does not require public Skill responses to expose internal Skill IDs", () => {
    const result = skillListItemSchema.safeParse({
      allowedTools: null,
      compatibility: null,
      createdAt: "2026-05-25T12:00:00.000Z",
      currentVersion: 1,
      description: "Demo description",
      license: null,
      metadata: null,
      name: "demo",
      updatedAt: "2026-05-25T12:00:00.000Z",
    });

    expect(result.success).toBeTruthy();
  });
});
