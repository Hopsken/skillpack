import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../db/client";
import { skillVersions, skills } from "../db/schema";
import { digestHex } from "../lib/crypto";
import { apiError, skillLocation } from "../lib/http";
import type { AppBindings } from "../types";
import {
  createSkillSchema,
  skillCatalogResponseSchema,
  skillReadResponseSchema
} from "../../shared/schemas/skills";

export const skillsRoute = new Hono<AppBindings>()
  .get("/catalog", async (c) => {
    const db = createDb(c.env.DB);
    const rows = await db.select().from(skills).all();

    const response = skillCatalogResponseSchema.parse({
      skills: rows.map((skill) => ({
        name: skill.name,
        description: skill.description,
        version: skill.latestVersion,
        location: skillLocation(skill.name)
      }))
    });

    return c.json(response);
  })
  .get("/:name", async (c) => {
    const db = createDb(c.env.DB);
    const [skill] = await db.select().from(skills).where(eq(skills.name, c.req.param("name"))).limit(1);

    if (!skill) {
      return c.json(apiError("Skill not found"), 404);
    }

    const [version] = await db
      .select()
      .from(skillVersions)
      .where(and(eq(skillVersions.skillId, skill.id), eq(skillVersions.version, skill.latestVersion)))
      .limit(1);

    if (!version) {
      return c.json(apiError("Skill version not found"), 404);
    }

    const object = await c.env.BUCKET.get(version.objectKey);
    if (!object) {
      return c.json(apiError("Skill object not found"), 404);
    }

    const response = skillReadResponseSchema.parse({
      name: skill.name,
      description: skill.description,
      version: version.version,
      location: skillLocation(skill.name, version.entryPath),
      content: await object.text(),
      resources: []
    });

    return c.json(response);
  })
  .post("/", zValidator("json", createSkillSchema), async (c) => {
    const input = c.req.valid("json");
    const db = createDb(c.env.DB);
    const existing = await db.select({ id: skills.id }).from(skills).where(eq(skills.name, input.name)).limit(1);

    if (existing.length > 0) {
      return c.json(apiError("Skill name already exists"), 409);
    }

    const now = new Date();
    const objectKey = `skills/${input.name}/${input.version}/SKILL.md`;
    const sha256 = await digestHex(input.content);

    await c.env.BUCKET.put(objectKey, input.content, {
      httpMetadata: { contentType: "text/markdown; charset=utf-8" },
      customMetadata: { sha256 }
    });

    const [skill] = await db
      .insert(skills)
      .values({
        name: input.name,
        description: input.description,
        latestVersion: input.version,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    if (!skill) {
      return c.json(apiError("Skill was not created"), 500);
    }

    await db.insert(skillVersions).values({
      skillId: skill.id,
      version: input.version,
      entryPath: "SKILL.md",
      objectKey,
      sha256,
      createdAt: now
    });

    return c.json(
      {
        name: input.name,
        description: input.description,
        version: input.version,
        location: skillLocation(input.name)
      },
      201
    );
  });
