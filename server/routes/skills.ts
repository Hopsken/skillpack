import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import {
  createSkillSchema,
  skillCatalogResponseSchema,
  skillReadResponseSchema,
} from "../../shared/schemas/skills";
import { createDb } from "../db/client";
import { skillVersions, skills } from "../db/schema";
import { digestHex } from "../lib/crypto";
import { apiError, skillLocation } from "../lib/http";
import type { AppBindings } from "../types";

export const skillsRoute = new Hono<AppBindings>()
  .get("/catalog", async (c) => {
    const db = createDb(c.env.DB);
    const rows = await db.select().from(skills).all();

    const response = skillCatalogResponseSchema.parse({
      skills: rows.map((skill) => ({
        description: skill.description,
        location: skillLocation(skill.name),
        name: skill.name,
        version: skill.latestVersion,
      })),
    });

    return c.json(response);
  })
  .get("/:name", async (c) => {
    const db = createDb(c.env.DB);
    const [skill] = await db
      .select()
      .from(skills)
      .where(eq(skills.name, c.req.param("name")))
      .limit(1);

    if (!skill) {
      return c.json(apiError("Skill not found"), 404);
    }

    const [version] = await db
      .select()
      .from(skillVersions)
      .where(
        and(
          eq(skillVersions.skillId, skill.id),
          eq(skillVersions.version, skill.latestVersion)
        )
      )
      .limit(1);

    if (!version) {
      return c.json(apiError("Skill version not found"), 404);
    }

    const object = await c.env.BUCKET.get(version.objectKey);
    if (!object) {
      return c.json(apiError("Skill object not found"), 404);
    }

    const response = skillReadResponseSchema.parse({
      content: await object.text(),
      description: skill.description,
      location: skillLocation(skill.name, version.entryPath),
      name: skill.name,
      resources: [],
      version: version.version,
    });

    return c.json(response);
  })
  .post("/", zValidator("json", createSkillSchema), async (c) => {
    const input = c.req.valid("json");
    const db = createDb(c.env.DB);
    const existing = await db
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.name, input.name))
      .limit(1);

    if (existing.length > 0) {
      return c.json(apiError("Skill name already exists"), 409);
    }

    const now = new Date();
    const objectKey = `skills/${input.name}/${input.version}/SKILL.md`;
    const sha256 = await digestHex(input.content);

    await c.env.BUCKET.put(objectKey, input.content, {
      customMetadata: { sha256 },
      httpMetadata: { contentType: "text/markdown; charset=utf-8" },
    });

    const [skill] = await db
      .insert(skills)
      .values({
        createdAt: now,
        description: input.description,
        latestVersion: input.version,
        name: input.name,
        updatedAt: now,
      })
      .returning();

    if (!skill) {
      return c.json(apiError("Skill was not created"), 500);
    }

    await db.insert(skillVersions).values({
      createdAt: now,
      entryPath: "SKILL.md",
      objectKey,
      sha256,
      skillId: skill.id,
      version: input.version,
    });

    return c.json(
      {
        description: input.description,
        location: skillLocation(input.name),
        name: input.name,
        version: input.version,
      },
      201
    );
  });
