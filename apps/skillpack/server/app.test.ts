import type { AppBindings } from "@server/types";
import type { Context } from "hono";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "./app";
import type { SkillService } from "./modules/skills/service";

type VerifySkillReadBearerUserId = NonNullable<
  NonNullable<Parameters<typeof createApp>[0]>["getSkillReadBearerUserId"]
>;

const testEnv = {
  BETTER_AUTH_SECRET: "test-secret",
  BUCKET: {},
  DB: {},
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
