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
import { parseSkillLocationInput } from "./location";
import {
  presentCreatedSkill,
  presentSkill,
  presentSkillFile,
  presentSkillList,
  presentSkillVersions,
} from "./presenter";
import {
  createSkillpackSkill,
  deleteSkill,
  listSkillVersionsForSkill,
  listSkills,
  readSkillResource,
  readSkillTextFile,
  resolveSkill,
} from "./service";
import type { ReadSkillFileInput } from "./types";

const skillErrorStatus = {
  "duplicate-resource-path": 400,
  "duplicate-skill-name": 409,
  "duplicate-skill-version": 409,
  "invalid-file-path": 400,
  "invalid-skill-locator": 400,
  "reserved-resource-path": 400,
  "skill-creation-failed": 500,
  "skill-file-not-found": 404,
  "skill-not-found": 404,
  "skill-object-not-found": 404,
  "skill-version-not-found": 404,
  "unsupported-source-type": 400,
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
  sourceType: string,
  locator: string
): ReadSkillFileInput => ({
  location: parseSkillLocationInput(sourceType, locator),
  path: parseFilePath(c.req.query("path")),
  version: c.req.query("version"),
});

const readRequestedSkillFile = (
  c: SkillContext,
  sourceType: string,
  locator: string
) =>
  readSkillResource(
    c.env.DB,
    c.env.BUCKET,
    getRequestedSkillFileInput(c, sourceType, locator)
  );

const readRequestedSkillTextFile = (
  c: SkillContext,
  sourceType: string,
  locator: string
) =>
  readSkillTextFile(
    c.env.DB,
    c.env.BUCKET,
    getRequestedSkillFileInput(c, sourceType, locator)
  );

const getRawFileHeaders = (
  result: Awaited<ReturnType<typeof readSkillResource>>
) =>
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

const parseTail = (tail: string) => {
  const parts = tail.split("/").filter(Boolean);

  if (parts.length === 0) {
    throw skillErrors.invalidSkillLocator();
  }

  return parts;
};

const handleSourceQualifiedRequest = async (c: SkillContext) => {
  try {
    const sourceType = c.req.param("sourceType") ?? "";
    const parts = parseTail(c.req.param("locator") ?? "");
    const locator = parts[0] ?? "";
    const location = parseSkillLocationInput(sourceType, locator);

    if (parts.length === 1 && c.req.method === "GET") {
      const result = await resolveSkill(
        c.env.DB,
        c.env.BUCKET,
        location,
        c.req.query("version")
      );
      return c.json(presentSkill(result));
    }

    if (parts.length === 1 && c.req.method === "DELETE") {
      await deleteSkill(c.env.DB, c.env.BUCKET, location);
      return c.body(null, 204);
    }

    if (
      parts.length === 2 &&
      parts[1] === "versions" &&
      c.req.method === "GET"
    ) {
      const result = await listSkillVersionsForSkill(c.env.DB, location);
      return c.json(presentSkillVersions(result.skill, result.versions));
    }

    if (
      parts.length === 2 &&
      parts[1] === "resources" &&
      c.req.method === "GET"
    ) {
      const result = await readRequestedSkillTextFile(c, sourceType, locator);
      return c.json(presentSkillFile(result));
    }

    if (
      parts.length === 3 &&
      parts[1] === "resources" &&
      parts[2] === "raw" &&
      c.req.method === "GET"
    ) {
      const result = await readRequestedSkillFile(c, sourceType, locator);
      return new Response(result.object.body, {
        headers: getRawFileHeaders(result),
      });
    }

    return c.json(apiError("Skill route not found"), 404);
  } catch (error) {
    return handleSkillError(c, error);
  }
};

export const skillsRoute = new Hono<AppBindings>()
  .get("/", async (c) => {
    const skills = await listSkills(c.env.DB);
    return c.json(presentSkillList(skills));
  })
  .post("/", zValidator("json", createSkillSchema), async (c) => {
    try {
      const result = await createSkillpackSkill(
        c.env.DB,
        c.env.BUCKET,
        c.req.valid("json")
      );
      return c.json(presentCreatedSkill(result), 201);
    } catch (error) {
      return handleSkillError(c, error);
    }
  })
  .all("/:sourceType/:locator{.+}", handleSourceQualifiedRequest);
