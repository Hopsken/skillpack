import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "./db/client";
import { skillVersions, skills } from "./db/schema";
import {
  createSkillSchema,
  skillCatalogResponseSchema,
  skillReadResponseSchema
} from "./schemas/skills";

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

const skillLocation = (name: string, path = "SKILL.md") => `api://skills/${name}/${path}`;
const apiError = (error: string) => ({ error });

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/v1/skills/catalog", async (c) => {
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
});

app.get("/api/v1/skills/:name", async (c) => {
  const name = c.req.param("name");
  const db = createDb(c.env.DB);
  const [skill] = await db.select().from(skills).where(eq(skills.name, name)).limit(1);

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

  const content = await object.text();
  const response = skillReadResponseSchema.parse({
    name: skill.name,
    description: skill.description,
    version: version.version,
    location: skillLocation(skill.name, version.entryPath),
    content,
    resources: []
  });

  return c.json(response);
});

app.post("/api/v1/skills", zValidator("json", createSkillSchema), async (c) => {
  const input = c.req.valid("json");
  const db = createDb(c.env.DB);
  const now = new Date();
  const objectKey = `skills/${input.name}/${input.version}/SKILL.md`;
  const sha256 = await digestHex(input.content);

  await c.env.BUCKET.put(objectKey, input.content, {
    httpMetadata: { contentType: "text/markdown; charset=utf-8" },
    customMetadata: { sha256 }
  });

  const inserted = await db
    .insert(skills)
    .values({
      name: input.name,
      description: input.description,
      latestVersion: input.version,
      createdAt: now,
      updatedAt: now
    })
    .returning();

  const skill = inserted[0];
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

app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

async function digestHex(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default app;
