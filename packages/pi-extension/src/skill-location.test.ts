import { describe, expect, it } from "vitest";

import {
  formatSkillpackCatalog,
  parseSkillpackLocation,
} from "./skill-location";

describe("Skillpack Skill Locations", () => {
  it("parses current Skillpack locations by Skill Name", () => {
    expect(
      parseSkillpackLocation("skill://skillpack/demo-skill")
    ).toStrictEqual({
      skillName: "demo-skill",
    });
  });

  it("rejects non-Skillpack, malformed, or pinned locations", () => {
    expect(() => parseSkillpackLocation("skill://github/acme/demo")).toThrow(
      "Expected skill://skillpack/{skillName}"
    );
    expect(() => parseSkillpackLocation("skill://skillpack/42")).toThrow(
      "Expected skill://skillpack/{skillName}"
    );
    expect(() =>
      parseSkillpackLocation("skill://skillpack/demo-skill?version=7")
    ).toThrow("Expected skill://skillpack/{skillName}");
  });

  it("formats catalog entries for system prompt injection", () => {
    expect(
      formatSkillpackCatalog([
        {
          description: "Use when checking <xml> escaping.",
          name: "demo-skill",
        },
      ])
    ).toContain("<location>skill://skillpack/demo-skill</location>");
    expect(
      formatSkillpackCatalog([
        {
          description: "Use when checking <xml> escaping.",
          name: "demo-skill",
        },
      ])
    ).toContain("Use when checking &lt;xml&gt; escaping.");
  });
});
