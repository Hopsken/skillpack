import type { AppBindings } from "@server/types";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import { skillsRoute } from "./route";
import type { SkillService } from "./service";

const createApp = (skillService: Partial<SkillService>) =>
  new Hono<AppBindings>()
    .use(async (c, next) => {
      c.set("skillService", skillService as SkillService);
      await next();
    })
    .route("/skills", skillsRoute);

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
});
