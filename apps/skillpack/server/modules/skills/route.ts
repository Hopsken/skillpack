import { zValidator } from "@hono/zod-validator";
import { apiError } from "@server/lib/http";
import type { AppBindings } from "@server/types";
import {
  createSkillSchema,
  forkSkillSchema,
  patchSkillSchema,
  restoreVersionSchema,
} from "@skillpack/contracts/skills/requests";
import {
  safeRelativePathSchema,
  skillIdSchema,
  skillVersionNumberSchema,
} from "@skillpack/core/primitives";
import { Hono } from "hono";
import type { Context } from "hono";

import { SkillModuleError, skillErrors } from "./errors";
import {
  presentPatchedSkill,
  presentForkedSkills,
  presentRestoredSkill,
  presentSkill,
  presentSkillFile,
  presentSkillList,
  presentSkillSummary,
  presentSkillVersions,
} from "./presenter";
import type { ReadSkillFileInput, ReadSkillFileResult } from "./types";

const skillErrorStatus = {
  "duplicate-resolved-skill-name": 400,
  "duplicate-resource-path": 400,
  "duplicate-skill-name": 409,
  "duplicate-skill-version": 409,
  "empty-skill-patch": 400,
  "invalid-file-path": 400,
  "invalid-skill-locator": 400,
  "reserved-resource-path": 400,
  "skill-creation-failed": 500,
  "skill-file-not-found": 404,
  "skill-not-found": 404,
  "skill-object-not-found": 404,
  "skill-version-not-found": 404,
} as const;

type SkillContext = Context<AppBindings>;

const parseSkillId = (value: string | undefined) => {
  const result = skillIdSchema.safeParse(value);

  if (!result.success) {
    throw skillErrors.invalidSkillLocator();
  }

  return result.data;
};

const parseRequiredVersion = (value: string | undefined) => {
  const result = skillVersionNumberSchema.safeParse(value);

  if (!result.success) {
    throw skillErrors.skillVersionNotFound();
  }

  return result.data;
};

const parseVersion = (value: string | undefined) => {
  if (!value) {
    return;
  }

  return parseRequiredVersion(value);
};

const parseFilePath = (path: string | undefined) => {
  const pathResult = safeRelativePathSchema.safeParse(path);

  if (!pathResult.success) {
    throw skillErrors.invalidFilePath();
  }

  return pathResult.data;
};

const getRequestedSkillFileInput = (c: SkillContext): ReadSkillFileInput => ({
  path: parseFilePath(c.req.query("path")),
  skillId: parseSkillId(c.req.param("skillId")),
  version: parseVersion(c.req.query("version")),
});

const getRawFileHeaders = (result: ReadSkillFileResult) =>
  new Headers({
    "content-length": String(result.object.size),
    "content-type": result.resource.mediaType,
    "x-skill-resource-sha256": result.resource.sha256,
    "x-skill-version": String(result.version.versionNumber),
  });

const handleSkillRouteError = (error: Error, c: SkillContext) => {
  if (error instanceof SkillModuleError) {
    return c.json(apiError(error.message), skillErrorStatus[error.code]);
  }

  throw error;
};

export const skillsRoute = new Hono<AppBindings>()
  .onError(handleSkillRouteError)
  .get("/", async (c) => {
    const skills = await c.var.skillService.listSkills();
    return c.json(presentSkillList(skills));
  })
  .post("/", zValidator("json", createSkillSchema), async (c) => {
    const result = await c.var.skillService.createSkill(c.req.valid("json"));
    return c.json(presentSkillSummary(result), 201);
  })
  .post("/fork", zValidator("json", forkSkillSchema), async (c) => {
    const result = await c.var.skillService.forkSkill(c.req.valid("json"));
    const status = result.results.some((item) => item.status === "forked")
      ? 201
      : 422;
    return c.json(presentForkedSkills(result), status);
  })
  .get("/:skillId", async (c) => {
    const result = await c.var.skillService.resolveSkill(
      parseSkillId(c.req.param("skillId")),
      parseVersion(c.req.query("version"))
    );
    return c.json(presentSkill(result));
  })
  .patch("/:skillId", zValidator("json", patchSkillSchema), async (c) => {
    const result = await c.var.skillService.patchSkill(
      parseSkillId(c.req.param("skillId")),
      c.req.valid("json")
    );
    return c.json(presentPatchedSkill(result));
  })
  .delete("/:skillId", async (c) => {
    await c.var.skillService.deleteSkill(parseSkillId(c.req.param("skillId")));
    return c.body(null, 204);
  })
  .get("/:skillId/versions", async (c) => {
    const result = await c.var.skillService.listSkillVersionsForSkill(
      parseSkillId(c.req.param("skillId"))
    );
    return c.json(
      presentSkillVersions(result.skill, result.currentVersion, result.versions)
    );
  })
  .post(
    "/:skillId/versions/:versionNumber/restore",
    zValidator("json", restoreVersionSchema),
    async (c) => {
      const result = await c.var.skillService.restoreSkillVersion(
        parseSkillId(c.req.param("skillId")),
        parseRequiredVersion(c.req.param("versionNumber")),
        c.req.valid("json")
      );
      return c.json(presentRestoredSkill(result));
    }
  )
  .get("/:skillId/resources", async (c) => {
    const result = await c.var.skillService.readSkillTextFile(
      getRequestedSkillFileInput(c)
    );
    return c.json(presentSkillFile(result));
  })
  .get("/:skillId/resources/raw", async (c) => {
    const result = await c.var.skillService.readSkillResource(
      getRequestedSkillFileInput(c)
    );
    return new Response(result.object.body, {
      headers: getRawFileHeaders(result),
    });
  });
