import { describe, expect, it, vi } from "vitest";

import { SkillpackClient } from "./client";

describe(SkillpackClient, () => {
  it("reads a Skillpack Managed Skill with Bearer auth", async () => {
    const fetch = vi.fn<
      (input: string | URL, init?: RequestInit) => Promise<Response>
    >((input, init) => {
      expect(String(input)).toBe(
        "https://skillpack.example/api/v1/skills/42?version=7"
      );
      expect(init?.headers).toMatchObject({
        authorization: "Bearer access-token",
      });

      return Promise.resolve(
        Response.json(
          {
            allowedTools: null,
            compatibility: null,
            content: "# Demo\n\nUse this.",
            createdAt: "2026-05-27T00:00:00.000Z",
            description: "Demo skill",
            id: 42,
            license: null,
            metadata: null,
            name: "demo-skill",
            resources: [
              {
                mediaType: "text/markdown; charset=utf-8",
                path: "references/demo.md",
                sha256: "abc",
                size: 12,
              },
            ],
            updatedAt: "2026-05-27T00:00:00.000Z",
            version: 7,
            versionLabel: "release",
          },
          { status: 200 }
        )
      );
    });
    const client = new SkillpackClient({
      fetch,
      getAccessToken: () => Promise.resolve("access-token"),
      getBaseUrl: () => Promise.resolve("https://skillpack.example"),
    });

    await expect(
      client.readSkill("skill://skillpack/42?version=7")
    ).resolves.toMatchObject({
      content: "# Demo\n\nUse this.",
      location: "skill://skillpack/42",
      name: "demo-skill",
      resources: [{ path: "references/demo.md" }],
      version: 7,
    });
  });

  it("reads text resources through the JSON resource endpoint", async () => {
    const fetch = vi.fn<() => Promise<Response>>(() =>
      Promise.resolve(
        Response.json({
          content: "# Reference",
          mediaType: "text/markdown; charset=utf-8",
          path: "references/demo.md",
          sha256: "abc",
          size: 11,
          version: 3,
        })
      )
    );
    const client = new SkillpackClient({
      fetch,
      getAccessToken: () => Promise.resolve("access-token"),
      getBaseUrl: () => Promise.resolve("https://skillpack.example/"),
    });

    await expect(
      client.readResource("skill://skillpack/42", "references/demo.md")
    ).resolves.toStrictEqual({
      content: "# Reference",
      encoding: "text",
      mediaType: "text/markdown; charset=utf-8",
      path: "references/demo.md",
      sha256: "abc",
      size: 11,
      version: 3,
    });
  });

  it("reads binary resources through the raw resource endpoint", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const fetch = vi.fn<() => Promise<Response>>(() => {
      const headers = new Headers({
        "content-type": "image/png",
        "x-skill-resource-sha256": "abc",
        "x-skill-version": "3",
      });
      return Promise.resolve(new Response(bytes, { headers, status: 200 }));
    });
    const client = new SkillpackClient({
      fetch,
      getAccessToken: () => Promise.resolve("access-token"),
      getBaseUrl: () => Promise.resolve("https://skillpack.example/"),
    });

    await expect(
      client.readResource("skill://skillpack/42", "assets/logo.png")
    ).resolves.toStrictEqual({
      content: "AQID",
      encoding: "base64",
      mediaType: "image/png",
      path: "assets/logo.png",
      sha256: "abc",
      size: 3,
      version: 3,
    });
  });
});
