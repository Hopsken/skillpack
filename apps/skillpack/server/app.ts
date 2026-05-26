import { Hono } from "hono";
import type { Context, Next } from "hono";
import { contextStorage } from "hono/context-storage";

import { createAuth } from "./auth";
import { createDb } from "./db/client";
import { apiError } from "./lib/http";
import { OriginService } from "./modules/origins/service";
import { SkillRepository } from "./modules/skills/repository";
import { ResourceManifest } from "./modules/skills/resource-manifest";
import { SkillService } from "./modules/skills/service";
import { SkillStorage } from "./modules/skills/storage";
import { apiRoutes } from "./routes";
import type { AppBindings } from "./types";

const getRequestOrigin = (url: string) => new URL(url).origin;

const setRequestServices = async (c: Context<AppBindings>, next: Next) => {
  const db = createDb(c.env.DB);
  const originService = new OriginService();
  const skillRepository = new SkillRepository(db);
  const skillStorage = new SkillStorage(c.env.BUCKET);
  const resourceManifest = new ResourceManifest(skillStorage);

  c.set("db", db);
  c.set("originService", originService);
  c.set("skillRepository", skillRepository);
  c.set("skillStorage", skillStorage);
  c.set(
    "skillService",
    new SkillService(skillRepository, resourceManifest, originService)
  );
  await next();
};

const requireAuth = async (c: Context<AppBindings>, next: Next) => {
  const origin = getRequestOrigin(c.req.url);
  let session: unknown | null;

  try {
    session = await createAuth(c.env, origin).api.getSession({
      asResponse: false,
      headers: c.req.raw.headers,
    });
  } catch {
    return c.json(apiError("Unauthorized"), 401);
  }

  if (!session) {
    return c.json(apiError("Unauthorized"), 401);
  }

  await next();
};

export const app = new Hono<AppBindings>()
  .use(contextStorage())
  .use(setRequestServices)
  .on(["GET", "POST"], "/api/auth/*", (c) => {
    const origin = getRequestOrigin(c.req.url);
    return createAuth(c.env, origin).handler(c.req.raw);
  })
  .use("/api/v1/origins", requireAuth)
  .use("/api/v1/origins/*", requireAuth)
  .use("/api/v1/skills", requireAuth)
  .use("/api/v1/skills/*", requireAuth)
  .route("/", apiRoutes);
