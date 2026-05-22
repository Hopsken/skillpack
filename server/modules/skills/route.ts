import { zValidator } from "@hono/zod-validator";
import { apiError } from "@server/lib/http";
import type { AppBindings } from "@server/types";
import {
  createSkillSchema,
  skillResourcePathSchema,
} from "@shared/schemas/skills";
import { Hono } from "hono";
import type { Context } from "hono";

import { SkillModuleError, skillErrors } from "./errors";
import {
  presentCreatedSkill,
  presentSkill,
  presentSkillCatalog,
  presentSkillFile,
  presentSkillVersions,
} from "./presenter";
import {
  createSkill,
  deleteSkill,
  listSkillCatalog,
  listSkillVersionHistory,
  readSkill,
  readSkillFile,
  readSkillTextFile,
} from "./service";
import type { ReadSkillFileInput } from "./types";

const skillErrorStatus = {
  "duplicate-resource-path": 400,
  "duplicate-skill-name": 409,
  "invalid-file-path": 400,
  "reserved-resource-path": 400,
  "skill-creation-failed": 500,
  "skill-file-not-found": 404,
  "skill-not-found": 404,
  "skill-object-not-found": 404,
  "skill-version-not-found": 404,
} as const;

type SkillContext = Context<AppBindings>;

const parseFilePath = (path: string | undefined) => {
  const pathResult = skillResourcePathSchema.safeParse(path);

  if (!pathResult.success) {
    throw skillErrors.invalidFilePath();
  }

  return pathResult.data;
};

const getRequestedSkillFileInput = (
  c: SkillContext,
  name: string
): ReadSkillFileInput => ({
  name,
  path: parseFilePath(c.req.query("path")),
  version: c.req.query("version"),
});

const readRequestedSkillFile = (c: SkillContext, name: string) =>
  readSkillFile(c.env.DB, c.env.BUCKET, getRequestedSkillFileInput(c, name));

const readRequestedSkillTextFile = (c: SkillContext, name: string) =>
  readSkillTextFile(
    c.env.DB,
    c.env.BUCKET,
    getRequestedSkillFileInput(c, name)
  );

const getRawFileHeaders = (result: Awaited<ReturnType<typeof readSkillFile>>) =>
  new Headers({
    "content-length": String(result.object.size),
    "content-type": result.resource.mediaType,
    "x-skill-resource-sha256": result.resource.sha256,
  });

const handleSkillError = (c: SkillContext, error: unknown) => {
  if (error instanceof SkillModuleError) {
    return c.json(apiError(error.message), skillErrorStatus[error.code]);
  }

  throw error;
};

export const skillsRoute = new Hono<AppBindings>()
  .get("/catalog", async (c) => {
    const skills = await listSkillCatalog(c.env.DB);
    return c.json(presentSkillCatalog(skills));
  })
  .get("/:name/versions", async (c) => {
    try {
      const result = await listSkillVersionHistory(
        c.env.DB,
        c.req.param("name")
      );
      return c.json(presentSkillVersions(result.skill, result.versions));
    } catch (error) {
      return handleSkillError(c, error);
    }
  })
  .get("/:name/files/raw", async (c) => {
    try {
      const result = await readRequestedSkillFile(c, c.req.param("name"));
      return new Response(result.object.body, {
        headers: getRawFileHeaders(result),
      });
    } catch (error) {
      return handleSkillError(c, error);
    }
  })
  .get("/:name/files", async (c) => {
    try {
      const result = await readRequestedSkillTextFile(c, c.req.param("name"));
      return c.json(presentSkillFile(result));
    } catch (error) {
      return handleSkillError(c, error);
    }
  })
  .get("/:name/versions/:version", async (c) => {
    try {
      const result = await readSkill(
        c.env.DB,
        c.env.BUCKET,
        c.req.param("name"),
        c.req.param("version")
      );
      return c.json(presentSkill(result));
    } catch (error) {
      return handleSkillError(c, error);
    }
  })
  .get("/:name", async (c) => {
    try {
      const result = await readSkill(
        c.env.DB,
        c.env.BUCKET,
        c.req.param("name")
      );
      return c.json(presentSkill(result));
    } catch (error) {
      return handleSkillError(c, error);
    }
  })
  .delete("/:name", async (c) => {
    try {
      await deleteSkill(c.env.DB, c.env.BUCKET, c.req.param("name"));
      return c.body(null, 204);
    } catch (error) {
      return handleSkillError(c, error);
    }
  })
  .post("/", zValidator("json", createSkillSchema), async (c) => {
    try {
      const result = await createSkill(
        c.env.DB,
        c.env.BUCKET,
        c.req.valid("json")
      );
      return c.json(presentCreatedSkill(result), 201);
    } catch (error) {
      return handleSkillError(c, error);
    }
  });
