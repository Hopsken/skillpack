import { describe, expect, it } from "vitest";

import { parseOriginSearchParams, toOriginSearchParams } from "./origin-url";

describe("origin URL helpers", () => {
  it("parses GitHub origin params", () => {
    const origin = parseOriginSearchParams(
      new URLSearchParams({
        branch: "main",
        kind: "github",
        repoUrl: "https://github.com/acme/skills",
        rev: "abc123",
      })
    );

    expect(origin).toStrictEqual({
      branch: "main",
      kind: "github",
      repoUrl: "https://github.com/acme/skills",
      rev: "abc123",
    });
  });

  it("rejects missing GitHub repo URL", () => {
    expect(
      parseOriginSearchParams(new URLSearchParams({ kind: "github" }))
    ).toBeUndefined();
  });

  it("rejects unsupported origin kind", () => {
    expect(
      parseOriginSearchParams(new URLSearchParams({ kind: "source" }))
    ).toBeUndefined();
  });

  it("serializes stable GitHub params", () => {
    expect(
      toOriginSearchParams({
        branch: "main",
        kind: "github",
        repoUrl: "https://github.com/acme/skills",
        rev: "abc123",
      }).toString()
    ).toBe(
      "kind=github&repoUrl=https%3A%2F%2Fgithub.com%2Facme%2Fskills&branch=main&rev=abc123"
    );
  });
});
