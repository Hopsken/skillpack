import { describe, expect, it } from "vitest";

import {
  formatSkillpackCatalog,
  parseSkillpackLocation,
} from "./skill-location";

describe("Skillpack Skill Locations", () => {
  it("parses current and pinned Skillpack locations by Skill Name", () => {
    expect(
      parseSkillpackLocation("skill://skillpack/demo-skill")
    ).toStrictEqual({
      skillName: "demo-skill",
      version: undefined,
    });

    expect(
      parseSkillpackLocation("skill://skillpack/demo-skill?version=7")
    ).toStrictEqual({
      skillName: "demo-skill",
      version: 7,
    });
  });

  it("rejects non-Skillpack or malformed locations", () => {
    expect(() => parseSkillpackLocation("skill://github/acme/demo")).toThrow(
      "Expected skill://skillpack/{skillName}"
    );
    expect(() => parseSkillpackLocation("skill://skillpack/42")).toThrow(
      "Expected skill://skillpack/{skillName}"
    );
    expect(() =>
      parseSkillpackLocation("skill://skillpack/demo-skill?version=0")
    ).toThrow("Expected positive numeric Skill version");
  });

  it("formats catalog entries for system prompt injection", () => {
    expect(
      formatSkillpackCatalog([
        {
          currentVersion: 3,
          description: "Use when checking <xml> escaping.",
          name: "demo-skill",
        },
      ])
    ).toContain("<location>skill://skillpack/demo-skill</location>");
    expect(
      formatSkillpackCatalog([
        {
          currentVersion: 3,
          description: "Use when checking <xml> escaping.",
          name: "demo-skill",
        },
      ])
    ).toContain("Use when checking &lt;xml&gt; escaping.");
  });
});
