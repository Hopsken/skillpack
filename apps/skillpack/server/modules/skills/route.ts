import { zValidator } from "@hono/zod-validator";
import { apiError } from "@server/lib/http";
import type { AppBindings } from "@server/types";
import {
  createSkillSchema,
  createSkillSnapshotSchema,
  forkSkillSchema,
  patchSkillSchema,
} from "@skillpack/contracts/skills/requests";
import {
  safeRelativePathSchema,
  skillNameSchema,
  skillSnapshotNumberSchema,
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
  presentSkillSnapshots,
} from "./presenter";
import type { ReadSkillFileByNameInput, ReadSkillFileResult } from "./types";

const skillErrorStatus = {
  "duplicate-resolved-skill-name": 400,
  "duplicate-resource-path": 400,
  "duplicate-skill-name": 409,
  "duplicate-skill-snapshot": 409,
  "empty-skill-patch": 400,
  "invalid-file-path": 400,
  "invalid-skill-locator": 400,
  "reserved-resource-path": 400,
  "skill-creation-failed": 500,
  "skill-file-not-found": 404,
  "skill-not-found": 404,
  "skill-object-not-found": 404,
  "skill-snapshot-not-found": 404,
} as const;

type SkillContext = Context<AppBindings>;

const parseSkillName = (value: string | undefined) => {
  const result = skillNameSchema.safeParse(value);

  if (!result.success) {
    throw skillErrors.invalidSkillLocator();
  }

  return result.data;
};

const parseRequiredSnapshot = (value: string | undefined) => {
  const result = skillSnapshotNumberSchema.safeParse(value);

  if (!result.success) {
    throw skillErrors.skillSnapshotNotFound();
  }

  return result.data;
};

const parseFilePath = (path: string | undefined) => {
  const pathResult = safeRelativePathSchema.safeParse(path);

  if (!pathResult.success) {
    throw skillErrors.invalidFilePath();
  }

  return pathResult.data;
};

const getRequestedSkillFileInput = (
  c: SkillContext
): ReadSkillFileByNameInput => ({
  path: parseFilePath(c.req.query("path")),
  skillName: parseSkillName(c.req.param("skillName")),
});

const getRawFileHeaders = (result: ReadSkillFileResult) =>
  new Headers({
    "content-length": String(result.object.size),
    "content-type": result.resource.mediaType,
    "x-skill-resource-sha256": result.resource.sha256,
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
  .get("/:skillName", async (c) => {
    const skillName = parseSkillName(c.req.param("skillName"));
    const result = await c.var.skillService.resolveSkillByName(skillName);
    return c.json(presentSkill(result));
  })
  .patch("/:skillName", zValidator("json", patchSkillSchema), async (c) => {
    const result = await c.var.skillService.patchSkillByName(
      parseSkillName(c.req.param("skillName")),
      c.req.valid("json")
    );
    return c.json(presentPatchedSkill(result));
  })
  .delete("/:skillName", async (c) => {
    await c.var.skillService.deleteSkillByName(
      parseSkillName(c.req.param("skillName"))
    );
    return c.body(null, 204);
  })
  .get("/:skillName/snapshots", async (c) => {
    const result = await c.var.skillService.listSkillSnapshotsForSkillName(
      parseSkillName(c.req.param("skillName"))
    );
    return c.json(presentSkillSnapshots(result.skill, result.snapshots));
  })
  .post(
    "/:skillName/snapshots",
    zValidator("json", createSkillSnapshotSchema),
    async (c) => {
      const snapshot = await c.var.skillService.createSkillSnapshotByName(
        parseSkillName(c.req.param("skillName")),
        c.req.valid("json")
      );
      return c.json(
        presentSkillSnapshots({ name: snapshot.stateJson.name }, [snapshot])
          .snapshots[0],
        201
      );
    }
  )
  .post("/:skillName/snapshots/:snapshotNumber/restore", async (c) => {
    const result = await c.var.skillService.restoreSkillSnapshotByName(
      parseSkillName(c.req.param("skillName")),
      parseRequiredSnapshot(c.req.param("snapshotNumber"))
    );
    return c.json(presentRestoredSkill(result));
  })
  .get("/:skillName/resources", async (c) => {
    const result = await c.var.skillService.readSkillTextFileByName(
      getRequestedSkillFileInput(c)
    );
    return c.json(presentSkillFile(result));
  })
  .get("/:skillName/resources/raw", async (c) => {
    const result = await c.var.skillService.readSkillResourceByName(
      getRequestedSkillFileInput(c)
    );
    return new Response(result.object.body, {
      headers: getRawFileHeaders(result),
    });
  });
