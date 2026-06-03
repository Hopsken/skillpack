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
  it("lists skills without exposing internal Skill IDs", async () => {
    const listSkills = vi.fn<SkillService["listSkills"]>().mockResolvedValue([
      {
        skill: resolvedSkill({ id: 123, name: "demo" }).skill,
        version: resolvedSkill({ id: 123, name: "demo" }).version,
      },
    ] as Awaited<ReturnType<SkillService["listSkills"]>>);
    const app = createApp({ listSkills });

    const response = await app.request("/skills");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({
      skills: [
        {
          allowedTools: "Read",
          compatibility: null,
          createdAt: "2026-05-25T12:00:00.000Z",
          currentVersion: 1,
          description: "Demo description",
          license: null,
          metadata: null,
          name: "demo",
          updatedAt: "2026-05-25T12:00:00.000Z",
        },
      ],
    });
    expect(listSkills).toHaveBeenCalledWith();
  });

  it("resolves Skill Names as the public operation identity", async () => {
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

  it("rejects numeric Skill IDs at the public API boundary", async () => {
    const resolveSkillByName = vi.fn<SkillService["resolveSkillByName"]>();
    const app = createApp({ resolveSkillByName });

    const response = await app.request("/skills/123?version=2");

    expect(response.status).toBe(400);
    expect(resolveSkillByName).not.toHaveBeenCalled();
  });

  it("reads resources by Skill Name", async () => {
    const readSkillTextFileByName = vi
      .fn<SkillService["readSkillTextFileByName"]>()
      .mockResolvedValue({
        content: "notes",
        resource: {
          mediaType: "text/plain",
          path: "references/notes.txt",
          sha256: "abc123",
          size: 5,
        },
        version: resolvedSkill({ name: "demo" }).version,
      });
    const app = createApp({ readSkillTextFileByName });

    const response = await app.request(
      "/skills/demo/resources?version=2&path=references%2Fnotes.txt"
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ content: "notes" });
    expect(readSkillTextFileByName).toHaveBeenCalledWith({
      path: "references/notes.txt",
      skillName: "demo",
      version: 2,
    });
  });
});
