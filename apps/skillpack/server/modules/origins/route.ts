import { zValidator } from "@hono/zod-validator";
import { apiError } from "@server/lib/http";
import type { AppBindings } from "@server/types";
import {
  discoverSkillsSchema,
  readSkillDefinitionsSchema,
} from "@skillpack/contracts/origins/requests";
import { Hono } from "hono";
import type { Context } from "hono";

import { OriginModuleError } from "./errors";
import { presentOriginDefinitions, presentOriginDiscovery } from "./presenter";

const originErrorStatus = {
  "origin-definition-failed": 502,
  "origin-discovery-failed": 502,
  "unsupported-origin-kind": 400,
} as const;

type OriginContext = Context<AppBindings>;

const handleOriginRouteError = (error: Error, c: OriginContext) => {
  if (error instanceof OriginModuleError) {
    return c.json(apiError(error.message), originErrorStatus[error.code]);
  }

  throw error;
};

export const originsRoute = new Hono<AppBindings>()
  .onError(handleOriginRouteError)
  .post("/discover", zValidator("json", discoverSkillsSchema), async (c) => {
    const result = await c.var.originService.discoverSkills(
      c.req.valid("json")
    );
    return c.json(presentOriginDiscovery(result));
  })
  .post(
    "/definitions",
    zValidator("json", readSkillDefinitionsSchema),
    async (c) => {
      const input = c.req.valid("json");
      const result = await c.var.originService.readSkillDefinitions(
        input.origin,
        input.selections
      );
      return c.json(presentOriginDefinitions(result));
    }
  );
