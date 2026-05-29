import { describe, expect, it } from "vitest";

import {
  formatSkillpackCatalog,
  parseSkillpackLocation,
} from "./skill-location";

describe("Skillpack Skill Locations", () => {
  it("parses current and pinned Skillpack locations", () => {
    expect(parseSkillpackLocation("skill://skillpack/42")).toStrictEqual({
      skillId: 42,
      version: undefined,
    });

    expect(
      parseSkillpackLocation("skill://skillpack/42?version=7")
    ).toStrictEqual({
      skillId: 42,
      version: 7,
    });
  });

  it("rejects non-Skillpack or malformed locations", () => {
    expect(() => parseSkillpackLocation("skill://github/acme/demo")).toThrow(
      "Expected skill://skillpack/{skillId}"
    );
    expect(() => parseSkillpackLocation("skill://skillpack/nope")).toThrow(
      "Expected positive numeric Skill ID"
    );
    expect(() =>
      parseSkillpackLocation("skill://skillpack/42?version=0")
    ).toThrow("Expected positive numeric Skill version");
  });

  it("formats catalog entries for system prompt injection", () => {
    expect(
      formatSkillpackCatalog([
        {
          currentVersion: 3,
          description: "Use when checking <xml> escaping.",
          id: 42,
          name: "demo-skill",
        },
      ])
    ).toContain("<location>skill://skillpack/42</location>");
    expect(
      formatSkillpackCatalog([
        {
          currentVersion: 3,
          description: "Use when checking <xml> escaping.",
          id: 42,
          name: "demo-skill",
        },
      ])
    ).toContain("Use when checking &lt;xml&gt; escaping.");
  });
});
