import type { AppBindings } from "@server/types";
import type { Context } from "hono";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "./app";
import type { SkillService } from "./modules/skills/service";
import type { ResolvedSkillResult } from "./modules/skills/types";

type VerifySkillReadBearerUserId = NonNullable<
  NonNullable<Parameters<typeof createApp>[0]>["getSkillReadBearerUserId"]
>;

const testEnv = {
  BETTER_AUTH_SECRET: "test-secret",
  BUCKET: {},
  DB: {},
  GITHUB_CLIENT_ID: "github-client",
  GITHUB_CLIENT_SECRET: "github-secret",
  OIDC_CLIENT_ID: "oidc-client",
  OIDC_DISCOVERY_URL: "https://issuer.example/.well-known/openid-configuration",
} as Env;

const setSkillServicesForUser =
  (skillService: Partial<SkillService>, seenUserIds: string[]) =>
  (c: Context<AppBindings>, userId: string) => {
    seenUserIds.push(userId);
    c.set("currentUser", { id: userId });
    c.set("skillService", skillService as SkillService);
  };

const resolvedSkill = (): ResolvedSkillResult => {
  const createdAt = new Date("2026-05-25T12:00:00.000Z");

  return {
    content: "# Demo\n",
    resources: [],
    skill: {
      createdAt,
      id: 42,
      name: "demo",
      ownerUserId: "user-oauth",
      updatedAt: createdAt,
    },
    version: {
      allowedTools: null,
      changeSummary: null,
      compatibility: null,
      createdAt,
      description: "Demo description",
      id: 7,
      label: null,
      license: null,
      metadata: null,
      skillId: 42,
      versionNumber: 1,
    },
  };
};

describe("app login provider discovery", () => {
  it("reports GitHub and OIDC when both provider configs are present", async () => {
    const app = createApp();

    const response = await app.request(
      "/api/auth/login-providers",
      undefined,
      testEnv
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({
      github: true,
      oidc: true,
    });
  });

  it("keeps OIDC optional when its provider config is absent", async () => {
    const app = createApp();

    const response = await app.request("/api/auth/login-providers", undefined, {
      ...testEnv,
      OIDC_CLIENT_ID: undefined,
      OIDC_DISCOVERY_URL: undefined,
    } as Env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({
      github: true,
      oidc: false,
    });
  });
});

describe("app OAuth bearer skills read auth", () => {
  it("serves protected resource metadata for skill reads", async () => {
    const app = createApp();

    const response = await app.request(
      "/.well-known/oauth-protected-resource",
      undefined,
      testEnv
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      authorization_servers: ["http://localhost"],
      bearer_methods_supported: ["header"],
      resource: "http://localhost",
      resource_name: "Skillpack Managed Skills",
      scopes_supported: ["skills:read"],
    });
  });

  it("allows bearer tokens with skills:read to list skills", async () => {
    const seenUserIds: string[] = [];
    const listSkills = vi
      .fn<SkillService["listSkills"]>()
      .mockResolvedValue([]);
    const getSkillReadBearerUserId = vi
      .fn<VerifySkillReadBearerUserId>()
      .mockResolvedValue("user-oauth");
    const app = createApp({
      getSkillReadBearerUserId,
      setSkillServicesForUser: setSkillServicesForUser(
        { listSkills },
        seenUserIds
      ),
    });

    const response = await app.request(
      "/api/v1/skills",
      { headers: { authorization: "Bearer access-token" } },
      testEnv
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({ skills: [] });
    expect(getSkillReadBearerUserId).toHaveBeenCalledOnce();
    expect(listSkills).toHaveBeenCalledOnce();
    expect(seenUserIds).toStrictEqual(["user-oauth"]);
  });

  it("allows bearer tokens with skills:read to read skill resources", async () => {
    const seenUserIds: string[] = [];
    const readSkillTextFile = vi.fn<SkillService["readSkillTextFile"]>();
    readSkillTextFile.mockResolvedValue({
      content: "resource body",
      resource: {
        mediaType: "text/markdown",
        path: "notes.md",
        sha256: "abc123",
        size: 13,
      },
      version: { versionNumber: 2 },
    } as Awaited<ReturnType<SkillService["readSkillTextFile"]>>);
    const getSkillReadBearerUserId = vi
      .fn<VerifySkillReadBearerUserId>()
      .mockResolvedValue("user-oauth");
    const app = createApp({
      getSkillReadBearerUserId,
      setSkillServicesForUser: setSkillServicesForUser(
        { readSkillTextFile },
        seenUserIds
      ),
    });

    const response = await app.request(
      "/api/v1/skills/42/resources?path=notes.md",
      { headers: { authorization: "Bearer access-token" } },
      testEnv
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({
      content: "resource body",
      mediaType: "text/markdown",
      path: "notes.md",
      sha256: "abc123",
      size: 13,
      version: 2,
    });
    expect(readSkillTextFile).toHaveBeenCalledWith({
      path: "notes.md",
      skillId: 42,
      version: undefined,
    });
    expect(seenUserIds).toStrictEqual(["user-oauth"]);
  });

  it("allows bearer tokens with skills:read to resolve skills by name", async () => {
    const seenUserIds: string[] = [];
    const resolveSkillByName = vi
      .fn<SkillService["resolveSkillByName"]>()
      .mockResolvedValue(resolvedSkill());
    const getSkillReadBearerUserId = vi
      .fn<VerifySkillReadBearerUserId>()
      .mockResolvedValue("user-oauth");
    const app = createApp({
      getSkillReadBearerUserId,
      setSkillServicesForUser: setSkillServicesForUser(
        { resolveSkillByName },
        seenUserIds
      ),
    });

    const response = await app.request(
      "/api/v1/skills/demo",
      { headers: { authorization: "Bearer access-token" } },
      testEnv
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 42,
      name: "demo",
    });
    expect(resolveSkillByName).toHaveBeenCalledWith("demo", undefined);
    expect(seenUserIds).toStrictEqual(["user-oauth"]);
  });

  it("rejects bearer tokens on skills write routes", async () => {
    const getSkillReadBearerUserId = vi
      .fn<VerifySkillReadBearerUserId>()
      .mockResolvedValue("user-oauth");
    const app = createApp({ getSkillReadBearerUserId });

    const response = await app.request(
      "/api/v1/skills",
      {
        body: JSON.stringify({ content: "# Demo", name: "demo" }),
        headers: {
          authorization: "Bearer access-token",
          "content-type": "application/json",
        },
        method: "POST",
      },
      testEnv
    );

    expect(response.status).toBe(401);
    expect(getSkillReadBearerUserId).not.toHaveBeenCalled();
  });
});

describe("app MCP auth", () => {
  const initializeRequest = {
    id: 1,
    jsonrpc: "2.0",
    method: "initialize",
    params: {
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
      protocolVersion: "2025-11-25",
    },
  };

  it("challenges unauthenticated MCP requests with Skillpack OAuth metadata", async () => {
    const app = createApp();

    const response = await app.request(
      "/mcp",
      {
        body: JSON.stringify(initializeRequest),
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        method: "POST",
      },
      testEnv
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe(
      'Bearer realm="mcp", resource_metadata="http://localhost/.well-known/oauth-protected-resource", scope="skills:read"'
    );
    await expect(response.json()).resolves.toStrictEqual({
      error: "Unauthorized",
    });
  });

  it("rejects non-POST MCP requests", async () => {
    const getSkillReadBearerUserId = vi
      .fn<VerifySkillReadBearerUserId>()
      .mockResolvedValue("user-oauth");
    const app = createApp({ getSkillReadBearerUserId });

    for (const method of ["GET", "DELETE"] as const) {
      const response = await app.request(
        "/mcp",
        {
          headers: { authorization: "Bearer access-token" },
          method,
        },
        testEnv
      );

      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("POST");
    }
    expect(getSkillReadBearerUserId).toHaveBeenCalledTimes(2);
  });

  it("allows bearer tokens with skills:read to initialize MCP", async () => {
    const seenUserIds: string[] = [];
    const getSkillReadBearerUserId = vi
      .fn<VerifySkillReadBearerUserId>()
      .mockResolvedValue("user-oauth");
    const app = createApp({
      getSkillReadBearerUserId,
      setSkillServicesForUser: setSkillServicesForUser({}, seenUserIds),
    });

    const response = await app.request(
      "/mcp",
      {
        body: JSON.stringify(initializeRequest),
        headers: {
          accept: "application/json",
          authorization: "Bearer access-token",
          "content-type": "application/json",
        },
        method: "POST",
      },
      testEnv
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 1,
      jsonrpc: "2.0",
      result: {
        serverInfo: { name: "skillpack-mcp" },
      },
    });
    expect(getSkillReadBearerUserId).toHaveBeenCalledOnce();
    expect(seenUserIds).toStrictEqual(["user-oauth"]);
  });

  it("rejects MCP requests when bearer verification fails", async () => {
    const getSkillReadBearerUserId = vi.fn<VerifySkillReadBearerUserId>();
    const app = createApp({ getSkillReadBearerUserId });

    const response = await app.request(
      "/mcp",
      {
        body: JSON.stringify(initializeRequest),
        headers: {
          accept: "application/json",
          authorization: "Bearer bad-token",
          "content-type": "application/json",
        },
        method: "POST",
      },
      testEnv
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      'Bearer realm="mcp"'
    );
    expect(getSkillReadBearerUserId).toHaveBeenCalledOnce();
  });

  it("allows MCP requests from the same browser origin", async () => {
    const getSkillReadBearerUserId = vi
      .fn<VerifySkillReadBearerUserId>()
      .mockResolvedValue("user-oauth");
    const app = createApp({
      getSkillReadBearerUserId,
      setSkillServicesForUser: setSkillServicesForUser({}, []),
    });

    const response = await app.request(
      "/mcp",
      {
        body: JSON.stringify(initializeRequest),
        headers: {
          accept: "application/json",
          authorization: "Bearer access-token",
          "content-type": "application/json",
          origin: "http://localhost",
        },
        method: "POST",
      },
      testEnv
    );

    expect(response.status).toBe(200);
    expect(getSkillReadBearerUserId).toHaveBeenCalledOnce();
  });

  it("rejects MCP requests from unexpected browser origins", async () => {
    const getSkillReadBearerUserId = vi
      .fn<VerifySkillReadBearerUserId>()
      .mockResolvedValue("user-oauth");
    const app = createApp({ getSkillReadBearerUserId });

    const response = await app.request(
      "/mcp",
      {
        body: JSON.stringify(initializeRequest),
        headers: {
          accept: "application/json",
          authorization: "Bearer access-token",
          "content-type": "application/json",
          origin: "https://evil.example",
        },
        method: "POST",
      },
      testEnv
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toStrictEqual({
      error: "Forbidden",
    });
    expect(getSkillReadBearerUserId).not.toHaveBeenCalled();
  });

  it("lists Skillpack MCP tools for authenticated agents", async () => {
    const getSkillReadBearerUserId = vi
      .fn<VerifySkillReadBearerUserId>()
      .mockResolvedValue("user-oauth");
    const app = createApp({
      getSkillReadBearerUserId,
      setSkillServicesForUser: setSkillServicesForUser({}, []),
    });

    const response = await app.request(
      "/mcp",
      {
        body: JSON.stringify({
          id: 2,
          jsonrpc: "2.0",
          method: "tools/list",
        }),
        headers: {
          accept: "application/json",
          authorization: "Bearer access-token",
          "content-type": "application/json",
        },
        method: "POST",
      },
      testEnv
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 2,
      jsonrpc: "2.0",
      result: {
        tools: [
          expect.objectContaining({ name: "skillpack_list" }),
          expect.objectContaining({ name: "skillpack_read" }),
        ],
      },
    });
  });

  it("returns the authenticated Skillpack catalog from skillpack_list", async () => {
    const createdAt = new Date("2026-05-25T12:00:00.000Z");
    const listSkills = vi.fn<SkillService["listSkills"]>().mockResolvedValue([
      {
        skill: {
          createdAt,
          id: 42,
          name: "demo-skill",
          ownerUserId: "user-oauth",
          updatedAt: createdAt,
        },
        version: {
          allowedTools: null,
          changeSummary: null,
          compatibility: null,
          createdAt,
          description: "Demo skill",
          id: 7,
          label: null,
          license: null,
          metadata: null,
          skillId: 42,
          versionNumber: 2,
        },
      },
    ] as Awaited<ReturnType<SkillService["listSkills"]>>);
    const app = createApp({
      getSkillReadBearerUserId: vi
        .fn<VerifySkillReadBearerUserId>()
        .mockResolvedValue("user-oauth"),
      setSkillServicesForUser: setSkillServicesForUser({ listSkills }, []),
    });

    const response = await app.request(
      "/mcp",
      {
        body: JSON.stringify({
          id: 3,
          jsonrpc: "2.0",
          method: "tools/call",
          params: { arguments: {}, name: "skillpack_list" },
        }),
        headers: {
          accept: "application/json",
          authorization: "Bearer access-token",
          "content-type": "application/json",
        },
        method: "POST",
      },
      testEnv
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result: { content: { text: string; type: string }[] };
    };
    expect(body.result.content).toStrictEqual([
      {
        text: JSON.stringify(
          {
            skills: [
              {
                currentVersion: 2,
                description: "Demo skill",
                location: "skill://skillpack/42",
                name: "demo-skill",
              },
            ],
          },
          null,
          2
        ),
        type: "text",
      },
    ]);
    expect(listSkills).toHaveBeenCalledOnce();
  });

  it("returns a Skillpack activation payload from skillpack_read", async () => {
    const createdAt = new Date("2026-05-25T12:00:00.000Z");
    const resolveSkill = vi
      .fn<SkillService["resolveSkill"]>()
      .mockResolvedValue({
        content: "# Demo\n\nUse this.",
        resources: [
          {
            createdAt,
            id: 1,
            mediaType: "text/markdown",
            path: "SKILL.md",
            sha256: "skill-md",
            size: 48,
            skillVersionId: 7,
          },
          {
            createdAt,
            id: 2,
            mediaType: "text/markdown",
            path: "references/demo.md",
            sha256: "abc123",
            size: 12,
            skillVersionId: 7,
          },
        ],
        skill: {
          createdAt,
          id: 42,
          name: "demo-skill",
          ownerUserId: "user-oauth",
          updatedAt: createdAt,
        },
        version: {
          allowedTools: null,
          changeSummary: null,
          compatibility: null,
          createdAt,
          description: "Demo skill",
          id: 7,
          label: null,
          license: null,
          metadata: null,
          skillId: 42,
          versionNumber: 2,
        },
      });
    const readSkillTextFile = vi
      .fn<SkillService["readSkillTextFile"]>()
      .mockResolvedValue({
        content: "---\nname: demo-skill\n---\n\n# Demo\n\nUse this.\n",
        resource: {
          mediaType: "text/markdown",
          path: "SKILL.md",
          sha256: "skill-md",
          size: 49,
        },
        version: { versionNumber: 2 },
      } as Awaited<ReturnType<SkillService["readSkillTextFile"]>>);
    const app = createApp({
      getSkillReadBearerUserId: vi
        .fn<VerifySkillReadBearerUserId>()
        .mockResolvedValue("user-oauth"),
      setSkillServicesForUser: setSkillServicesForUser(
        { readSkillTextFile, resolveSkill },
        []
      ),
    });

    const response = await app.request(
      "/mcp",
      {
        body: JSON.stringify({
          id: 4,
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            arguments: { location: "skill://skillpack/42?version=2" },
            name: "skillpack_read",
          },
        }),
        headers: {
          accept: "application/json",
          authorization: "Bearer access-token",
          "content-type": "application/json",
        },
        method: "POST",
      },
      testEnv
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result: { content: { text: string; type: string }[] };
    };
    expect(body.result.content).toStrictEqual([
      {
        text: '<skill>\n---\nname: demo-skill\n---\n\n# Demo\n\nUse this.\n\n<resources>\n  <resource path="references/demo.md" media_type="text/markdown" size="12" />\n</resources>\n</skill>',
        type: "text",
      },
    ]);
    expect(resolveSkill).toHaveBeenCalledWith(42, 2);
    expect(readSkillTextFile).toHaveBeenCalledWith({
      path: "SKILL.md",
      skillId: 42,
      version: 2,
    });
  });

  it("returns attached resources from skillpack_read with a path", async () => {
    const readSkillTextFile = vi
      .fn<SkillService["readSkillTextFile"]>()
      .mockResolvedValue({
        content: "# Reference",
        resource: {
          mediaType: "text/markdown",
          path: "references/demo.md",
          sha256: "abc123",
          size: 11,
        },
        version: { versionNumber: 2 },
      } as Awaited<ReturnType<SkillService["readSkillTextFile"]>>);
    const app = createApp({
      getSkillReadBearerUserId: vi
        .fn<VerifySkillReadBearerUserId>()
        .mockResolvedValue("user-oauth"),
      setSkillServicesForUser: setSkillServicesForUser(
        { readSkillTextFile },
        []
      ),
    });

    const response = await app.request(
      "/mcp",
      {
        body: JSON.stringify({
          id: 5,
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            arguments: {
              location: "skill://skillpack/42?version=2",
              path: "references/demo.md",
            },
            name: "skillpack_read",
          },
        }),
        headers: {
          accept: "application/json",
          authorization: "Bearer access-token",
          "content-type": "application/json",
        },
        method: "POST",
      },
      testEnv
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result: { content: { text: string; type: string }[] };
    };
    expect(body.result.content).toStrictEqual([
      { text: "# Reference", type: "text" },
    ]);
    expect(readSkillTextFile).toHaveBeenCalledWith({
      path: "references/demo.md",
      skillId: 42,
      version: 2,
    });
  });

  it("rejects unsafe skillpack_read resource paths before service lookup", async () => {
    const readSkillTextFile = vi.fn<SkillService["readSkillTextFile"]>();
    const app = createApp({
      getSkillReadBearerUserId: vi
        .fn<VerifySkillReadBearerUserId>()
        .mockResolvedValue("user-oauth"),
      setSkillServicesForUser: setSkillServicesForUser(
        { readSkillTextFile },
        []
      ),
    });

    const response = await app.request(
      "/mcp",
      {
        body: JSON.stringify({
          id: 11,
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            arguments: {
              location: "skill://skillpack/42?version=2",
              path: "../secret.md",
            },
            name: "skillpack_read",
          },
        }),
        headers: {
          accept: "application/json",
          authorization: "Bearer access-token",
          "content-type": "application/json",
        },
        method: "POST",
      },
      testEnv
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 11,
      jsonrpc: "2.0",
      result: {
        isError: true,
      },
    });
    expect(readSkillTextFile).not.toHaveBeenCalled();
  });

  it("lists Skillpack skills and attached resources as MCP resources", async () => {
    const createdAt = new Date("2026-05-25T12:00:00.000Z");
    const listSkills = vi.fn<SkillService["listSkills"]>().mockResolvedValue([
      {
        skill: {
          createdAt,
          id: 42,
          name: "demo-skill",
          ownerUserId: "user-oauth",
          updatedAt: createdAt,
        },
        version: {
          allowedTools: null,
          changeSummary: null,
          compatibility: null,
          createdAt,
          description: "Demo skill",
          id: 7,
          label: null,
          license: null,
          metadata: null,
          skillId: 42,
          versionNumber: 2,
        },
      },
    ] as Awaited<ReturnType<SkillService["listSkills"]>>);
    const resolveSkill = vi
      .fn<SkillService["resolveSkill"]>()
      .mockResolvedValue({
        ...resolvedSkill(),
        resources: [
          {
            createdAt,
            id: 1,
            mediaType: "text/markdown",
            path: "SKILL.md",
            sha256: "skill-md",
            size: 48,
            skillVersionId: 7,
          },
          {
            createdAt,
            id: 2,
            mediaType: "text/markdown",
            path: "references/demo.md",
            sha256: "abc123",
            size: 12,
            skillVersionId: 7,
          },
        ],
        version: { ...resolvedSkill().version, versionNumber: 2 },
      });
    const app = createApp({
      getSkillReadBearerUserId: vi
        .fn<VerifySkillReadBearerUserId>()
        .mockResolvedValue("user-oauth"),
      setSkillServicesForUser: setSkillServicesForUser(
        { listSkills, resolveSkill },
        []
      ),
    });

    const response = await app.request(
      "/mcp",
      {
        body: JSON.stringify({
          id: 6,
          jsonrpc: "2.0",
          method: "resources/list",
        }),
        headers: {
          accept: "application/json",
          authorization: "Bearer access-token",
          "content-type": "application/json",
        },
        method: "POST",
      },
      testEnv
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 6,
      jsonrpc: "2.0",
      result: {
        resources: [
          expect.objectContaining({
            name: "demo-skill",
            uri: "skill://skillpack/42?version=2",
          }),
          expect.objectContaining({
            mimeType: "text/markdown",
            name: "demo-skill: references/demo.md",
            uri: "skillpack-resource://skillpack/42?version=2&path=references%2Fdemo.md",
          }),
        ],
      },
    });
    expect(listSkills).toHaveBeenCalledOnce();
    expect(resolveSkill).toHaveBeenCalledWith(42, 2);
  });

  it("reads attached Skillpack MCP resources by URI", async () => {
    const readSkillTextFile = vi
      .fn<SkillService["readSkillTextFile"]>()
      .mockResolvedValue({
        content: "# Reference",
        resource: {
          mediaType: "text/markdown",
          path: "references/demo.md",
          sha256: "abc123",
          size: 11,
        },
        version: { versionNumber: 2 },
      } as Awaited<ReturnType<SkillService["readSkillTextFile"]>>);
    const app = createApp({
      getSkillReadBearerUserId: vi
        .fn<VerifySkillReadBearerUserId>()
        .mockResolvedValue("user-oauth"),
      setSkillServicesForUser: setSkillServicesForUser(
        { readSkillTextFile },
        []
      ),
    });

    const response = await app.request(
      "/mcp",
      {
        body: JSON.stringify({
          id: 7,
          jsonrpc: "2.0",
          method: "resources/read",
          params: {
            uri: "skillpack-resource://skillpack/42?version=2&path=references%2Fdemo.md",
          },
        }),
        headers: {
          accept: "application/json",
          authorization: "Bearer access-token",
          "content-type": "application/json",
        },
        method: "POST",
      },
      testEnv
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 7,
      jsonrpc: "2.0",
      result: {
        contents: [
          {
            mimeType: "text/markdown",
            text: "# Reference",
            uri: "skillpack-resource://skillpack/42?version=2&path=references%2Fdemo.md",
          },
        ],
      },
    });
    expect(readSkillTextFile).toHaveBeenCalledWith({
      path: "references/demo.md",
      skillId: 42,
      version: 2,
    });
  });

  it("reads Skillpack skill resources by skill URI", async () => {
    const readSkillTextFile = vi
      .fn<SkillService["readSkillTextFile"]>()
      .mockResolvedValue({
        content: "---\nname: demo-skill\n---\n\n# Demo",
        resource: {
          mediaType: "text/markdown",
          path: "SKILL.md",
          sha256: "skill-md",
          size: 34,
        },
        version: { versionNumber: 2 },
      } as Awaited<ReturnType<SkillService["readSkillTextFile"]>>);
    const app = createApp({
      getSkillReadBearerUserId: vi
        .fn<VerifySkillReadBearerUserId>()
        .mockResolvedValue("user-oauth"),
      setSkillServicesForUser: setSkillServicesForUser(
        { readSkillTextFile },
        []
      ),
    });

    const response = await app.request(
      "/mcp",
      {
        body: JSON.stringify({
          id: 8,
          jsonrpc: "2.0",
          method: "resources/read",
          params: { uri: "skill://skillpack/42?version=2" },
        }),
        headers: {
          accept: "application/json",
          authorization: "Bearer access-token",
          "content-type": "application/json",
        },
        method: "POST",
      },
      testEnv
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 8,
      jsonrpc: "2.0",
      result: {
        contents: [
          {
            mimeType: "text/markdown",
            text: "---\nname: demo-skill\n---\n\n# Demo",
            uri: "skill://skillpack/42?version=2",
          },
        ],
      },
    });
    expect(readSkillTextFile).toHaveBeenCalledWith({
      path: "SKILL.md",
      skillId: 42,
      version: 2,
    });
  });

  it("serves a Skillpack prompt guide with the authenticated catalog", async () => {
    const createdAt = new Date("2026-05-25T12:00:00.000Z");
    const listSkills = vi.fn<SkillService["listSkills"]>().mockResolvedValue([
      {
        skill: {
          createdAt,
          id: 42,
          name: "demo-skill",
          ownerUserId: "user-oauth",
          updatedAt: createdAt,
        },
        version: {
          allowedTools: null,
          changeSummary: null,
          compatibility: null,
          createdAt,
          description: "Demo skill",
          id: 7,
          label: null,
          license: null,
          metadata: null,
          skillId: 42,
          versionNumber: 2,
        },
      },
    ] as Awaited<ReturnType<SkillService["listSkills"]>>);
    const app = createApp({
      getSkillReadBearerUserId: vi
        .fn<VerifySkillReadBearerUserId>()
        .mockResolvedValue("user-oauth"),
      setSkillServicesForUser: setSkillServicesForUser({ listSkills }, []),
    });

    const response = await app.request(
      "/mcp",
      {
        body: JSON.stringify({
          id: 9,
          jsonrpc: "2.0",
          method: "prompts/get",
          params: { name: "use_skillpack_skills" },
        }),
        headers: {
          accept: "application/json",
          authorization: "Bearer access-token",
          "content-type": "application/json",
        },
        method: "POST",
      },
      testEnv
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 9,
      jsonrpc: "2.0",
      result: {
        messages: [
          {
            content: {
              text: expect.stringContaining(
                "<location>skill://skillpack/42</location>"
              ),
              type: "text",
            },
            role: "user",
          },
        ],
      },
    });
    expect(listSkills).toHaveBeenCalledOnce();
  });

  it("lists the Skillpack prompt guide", async () => {
    const app = createApp({
      getSkillReadBearerUserId: vi
        .fn<VerifySkillReadBearerUserId>()
        .mockResolvedValue("user-oauth"),
      setSkillServicesForUser: setSkillServicesForUser({}, []),
    });

    const response = await app.request(
      "/mcp",
      {
        body: JSON.stringify({
          id: 10,
          jsonrpc: "2.0",
          method: "prompts/list",
        }),
        headers: {
          accept: "application/json",
          authorization: "Bearer access-token",
          "content-type": "application/json",
        },
        method: "POST",
      },
      testEnv
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 10,
      jsonrpc: "2.0",
      result: {
        prompts: [expect.objectContaining({ name: "use_skillpack_skills" })],
      },
    });
  });
});
