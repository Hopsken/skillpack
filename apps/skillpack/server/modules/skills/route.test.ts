import type { AppBindings } from "@server/types";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import { skillsRoute } from "./route";
import type { SkillService } from "./service";
import type { ResolvedSkillResult } from "./types";

const createApp = (skillService: Partial<SkillService>) =>
  new Hono<AppBindings>()
    .use(async (c, next) => {
      c.set("skillService", skillService as SkillService);
      await next();
    })
    .route("/skills", skillsRoute);

const resolvedSkill = (input?: {
  id?: number;
  name?: string;
  version?: number;
}): ResolvedSkillResult => {
  const createdAt = new Date("2026-05-25T12:00:00.000Z");

  return {
    content: "# Demo\n",
    resources: [],
    skill: {
      createdAt,
      id: input?.id ?? 1,
      name: input?.name ?? "demo",
      ownerUserId: "user-a",
      updatedAt: createdAt,
    },
    version: {
      allowedTools: "Read",
      changeSummary: null,
      compatibility: null,
      createdAt,
      description: "Demo description",
      id: 10,
      label: null,
      license: null,
      metadata: null,
      skillId: input?.id ?? 1,
      versionNumber: input?.version ?? 1,
    },
  };
};

describe("skillsRoute owner scope", () => {
  it("lists skills through the request-scoped skill service", async () => {
    const listSkills = vi
      .fn<SkillService["listSkills"]>()
      .mockResolvedValue([]);
    const app = createApp({ listSkills });

    const response = await app.request("/skills");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({ skills: [] });
    expect(listSkills).toHaveBeenCalledWith();
  });

  it("resolves a numeric skill identifier by Skill ID", async () => {
    const resolveSkill = vi
      .fn<SkillService["resolveSkill"]>()
      .mockResolvedValue(resolvedSkill({ id: 123 }));
    const app = createApp({ resolveSkill });

    const response = await app.request("/skills/123?version=2");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 123,
      version: 1,
    });
    expect(resolveSkill).toHaveBeenCalledWith(123, 2);
  });

  it("resolves a non-numeric skill identifier by Skill Name", async () => {
    const resolveSkillByName = vi
      .fn<SkillService["resolveSkillByName"]>()
      .mockResolvedValue(resolvedSkill({ name: "demo-skill", version: 2 }));
    const app = createApp({ resolveSkillByName });

    const response = await app.request("/skills/demo-skill?version=2");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      name: "demo-skill",
      version: 2,
    });
    expect(resolveSkillByName).toHaveBeenCalledWith("demo-skill", 2);
  });
});
