import { zValidator } from "@hono/zod-validator";
import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import type { Context } from "hono";

import {
  createSkillSchema,
  skillCatalogResponseSchema,
  skillFileResponseSchema,
  skillReadResponseSchema,
  skillResourcePathSchema,
  skillVersionsResponseSchema,
} from "../../shared/schemas/skills";
import type { CreateSkillResourceInput } from "../../shared/schemas/skills";
import { createDb } from "../db/client";
import { skillResources, skillVersions, skills } from "../db/schema";
import { digestHex } from "../lib/crypto";
import { apiError, skillLocation } from "../lib/http";
import type { AppBindings } from "../types";

const markdownMediaType = "text/markdown; charset=utf-8";
const textMediaType = "text/plain; charset=utf-8";
const skillEntryPath = "SKILL.md";

const getTextSize = (content: string) =>
  new TextEncoder().encode(content).length;

const getResourceObjectKey = (
  skillName: string,
  version: string,
  path: string
) => `skills/${skillName}/${version}/${path}`;

const getDefaultMediaType = (path: string) => {
  const lowerPath = path.toLowerCase();

  if (lowerPath.endsWith(".md")) {
    return markdownMediaType;
  }

  if (lowerPath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }

  if (lowerPath.endsWith(".js") || lowerPath.endsWith(".mjs")) {
    return "text/javascript; charset=utf-8";
  }

  if (lowerPath.endsWith(".ts")) {
    return "text/typescript; charset=utf-8";
  }

  if (lowerPath.endsWith(".py")) {
    return "text/x-python; charset=utf-8";
  }

  if (lowerPath.endsWith(".sh")) {
    return "text/x-shellscript; charset=utf-8";
  }

  return textMediaType;
};

const readSkillByName = async (c: Context<AppBindings>, name: string) => {
  const db = createDb(c.env.DB);
  const [skill] = await db
    .select()
    .from(skills)
    .where(eq(skills.name, name))
    .limit(1);

  return skill;
};

const readSkillVersionRow = async (
  c: Context<AppBindings>,
  skillId: number,
  versionName: string
) => {
  const db = createDb(c.env.DB);
  const [version] = await db
    .select()
    .from(skillVersions)
    .where(
      and(
        eq(skillVersions.skillId, skillId),
        eq(skillVersions.version, versionName)
      )
    )
    .limit(1);

  return version;
};

const readVersionResources = async (
  c: Context<AppBindings>,
  skillVersionId: number
) => {
  const db = createDb(c.env.DB);
  const resources = await db
    .select()
    .from(skillResources)
    .where(eq(skillResources.skillVersionId, skillVersionId))
    .all();

  return resources;
};

const readSkillAndVersion = async (
  c: Context<AppBindings>,
  requestedVersion?: string
) => {
  const name = c.req.param("name");

  if (!name) {
    return { error: c.json(apiError("Skill name is required"), 400) };
  }

  const skill = await readSkillByName(c, name);

  if (!skill) {
    return { error: c.json(apiError("Skill not found"), 404) };
  }

  const versionName = requestedVersion ?? skill.latestVersion;
  const version = await readSkillVersionRow(c, skill.id, versionName);

  if (!version) {
    return { error: c.json(apiError("Skill version not found"), 404) };
  }

  return { skill, version };
};

const readSkillVersion = async (
  c: Context<AppBindings>,
  requestedVersion?: string
) => {
  const result = await readSkillAndVersion(c, requestedVersion);

  if (result.error) {
    return result.error;
  }

  const { skill, version } = result;
  const object = await c.env.BUCKET.get(version.objectKey);

  if (!object) {
    return c.json(apiError("Skill object not found"), 404);
  }

  const resources = await readVersionResources(c, version.id);
  const response = skillReadResponseSchema.parse({
    content: await object.text(),
    description: skill.description,
    location: skillLocation(skill.name, version.entryPath),
    name: skill.name,
    resources: resources.map((resource) => ({
      mediaType: resource.mediaType,
      path: resource.path,
      sha256: resource.sha256,
      size: resource.size,
    })),
    version: version.version,
  });

  return c.json(response);
};

const findResourceByPath = async (
  c: Context<AppBindings>,
  skillVersionId: number,
  path: string
) => {
  const db = createDb(c.env.DB);
  const [resource] = await db
    .select()
    .from(skillResources)
    .where(
      and(
        eq(skillResources.skillVersionId, skillVersionId),
        eq(skillResources.path, path)
      )
    )
    .limit(1);

  return resource;
};

const readFileObject = async (c: Context<AppBindings>) => {
  const pathResult = skillResourcePathSchema.safeParse(c.req.query("path"));
  const requestedVersion = c.req.query("version");

  if (!pathResult.success) {
    return { error: c.json(apiError("Valid file path is required"), 400) };
  }

  const path = pathResult.data;

  const result = await readSkillAndVersion(c, requestedVersion);

  if (result.error) {
    return { error: result.error };
  }

  const { skill, version } = result;

  if (path === version.entryPath) {
    const object = await c.env.BUCKET.get(version.objectKey);

    if (!object) {
      return { error: c.json(apiError("Skill object not found"), 404) };
    }

    return {
      object,
      resource: {
        mediaType: markdownMediaType,
        path: version.entryPath,
        sha256: version.sha256,
        size: object.size,
      },
      skill,
      version,
    };
  }

  const resource = await findResourceByPath(c, version.id, path);

  if (!resource) {
    return { error: c.json(apiError("Skill file not found"), 404) };
  }

  const object = await c.env.BUCKET.get(resource.objectKey);

  if (!object) {
    return { error: c.json(apiError("Skill object not found"), 404) };
  }

  return { object, resource, skill, version };
};

const deleteSkillObjects = async (
  c: Context<AppBindings>,
  skillName: string
) => {
  const prefix = `skills/${skillName}/`;
  let cursor: string | undefined;

  do {
    const listed = await c.env.BUCKET.list({ cursor, prefix });
    const keys = listed.objects.map((object) => object.key);

    if (keys.length > 0) {
      await c.env.BUCKET.delete(keys);
    }

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
};

const deleteSkillById = async (
  c: Context<AppBindings>,
  skillId: number,
  skillName: string
) => {
  const db = createDb(c.env.DB);
  const versions = await db
    .select({ id: skillVersions.id })
    .from(skillVersions)
    .where(eq(skillVersions.skillId, skillId))
    .all();
  const versionIds = versions.map((version) => version.id);

  if (versionIds.length > 0) {
    await db
      .delete(skillResources)
      .where(inArray(skillResources.skillVersionId, versionIds));
  }

  await db.delete(skillVersions).where(eq(skillVersions.skillId, skillId));
  await db.delete(skills).where(eq(skills.id, skillId));
  await deleteSkillObjects(c, skillName);
};

interface StoredResourceObject {
  mediaType: string;
  objectKey: string;
  path: string;
  sha256: string;
  size: number;
}

const putResourceObject = async (
  c: Context<AppBindings>,
  skillName: string,
  version: string,
  resource: CreateSkillResourceInput
): Promise<StoredResourceObject> => {
  const mediaType = resource.mediaType ?? getDefaultMediaType(resource.path);
  const objectKey = getResourceObjectKey(skillName, version, resource.path);
  const sha256 = await digestHex(resource.content);
  const size = getTextSize(resource.content);

  await c.env.BUCKET.put(objectKey, resource.content, {
    customMetadata: { sha256 },
    httpMetadata: { contentType: mediaType },
  });

  return {
    mediaType,
    objectKey,
    path: resource.path,
    sha256,
    size,
  };
};

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
  .get("/:name/versions", async (c) => {
    const db = createDb(c.env.DB);
    const skill = await readSkillByName(c, c.req.param("name"));

    if (!skill) {
      return c.json(apiError("Skill not found"), 404);
    }

    const versions = await db
      .select()
      .from(skillVersions)
      .where(eq(skillVersions.skillId, skill.id))
      .all();

    const response = skillVersionsResponseSchema.parse({
      name: skill.name,
      versions: versions.map((version) => ({
        createdAt: version.createdAt.toISOString(),
        location: skillLocation(skill.name, version.entryPath),
        version: version.version,
      })),
    });

    return c.json(response);
  })
  .get("/:name/files/raw", async (c) => {
    const result = await readFileObject(c);

    if (result.error) {
      return result.error;
    }

    const { object, resource } = result;
    const headers = new Headers({
      "content-length": String(object.size),
      "content-type": resource.mediaType,
      "x-skill-resource-sha256": resource.sha256,
    });

    return new Response(object.body, { headers });
  })
  .get("/:name/files", async (c) => {
    const result = await readFileObject(c);

    if (result.error) {
      return result.error;
    }

    const { object, resource, version } = result;
    const response = skillFileResponseSchema.parse({
      content: await object.text(),
      mediaType: resource.mediaType,
      path: resource.path,
      sha256: resource.sha256,
      size: resource.size,
      version: version.version,
    });

    return c.json(response);
  })
  .get("/:name/versions/:version", (c) =>
    readSkillVersion(c, c.req.param("version"))
  )
  .get("/:name", (c) => readSkillVersion(c))
  .delete("/:name", async (c) => {
    const skill = await readSkillByName(c, c.req.param("name"));

    if (!skill) {
      return c.json(apiError("Skill not found"), 404);
    }

    await deleteSkillById(c, skill.id, skill.name);

    return c.body(null, 204);
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

    const resourcePaths = new Set(
      input.resources.map((resource) => resource.path)
    );

    if (resourcePaths.size !== input.resources.length) {
      return c.json(apiError("Resource paths must be unique"), 400);
    }

    if (resourcePaths.has(skillEntryPath)) {
      return c.json(apiError("Resource path is reserved for SKILL.md"), 400);
    }

    const now = new Date();
    const objectKey = getResourceObjectKey(
      input.name,
      input.version,
      skillEntryPath
    );
    const sha256 = await digestHex(input.content);
    const resourceObjects: StoredResourceObject[] = [];

    await c.env.BUCKET.put(objectKey, input.content, {
      customMetadata: { sha256 },
      httpMetadata: { contentType: markdownMediaType },
    });

    for (const resource of input.resources) {
      resourceObjects.push(
        await putResourceObject(c, input.name, input.version, resource)
      );
    }

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

    const [version] = await db
      .insert(skillVersions)
      .values({
        createdAt: now,
        entryPath: skillEntryPath,
        objectKey,
        sha256,
        skillId: skill.id,
        version: input.version,
      })
      .returning();

    if (!version) {
      return c.json(apiError("Skill version was not created"), 500);
    }

    if (resourceObjects.length > 0) {
      await db.insert(skillResources).values(
        resourceObjects.map((resource) => ({
          createdAt: now,
          mediaType: resource.mediaType,
          objectKey: resource.objectKey,
          path: resource.path,
          sha256: resource.sha256,
          size: resource.size,
          skillVersionId: version.id,
        }))
      );
    }

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
