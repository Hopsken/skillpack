import { Hono } from "hono";
import type { Context, Next } from "hono";
import { contextStorage } from "hono/context-storage";

import { createAuth } from "./auth";
import { createDb } from "./db/client";
import { apiError } from "./lib/http";
import { apiRoutes } from "./routes";
import type { AppBindings } from "./types";

const getRequestOrigin = (url: string) => new URL(url).origin;

const setDatabase = async (c: Context<AppBindings>, next: Next) => {
  c.set("db", createDb(c.env.DB));
  await next();
};

const requireAuth = async (c: Context<AppBindings>, next: Next) => {
  const origin = getRequestOrigin(c.req.url);
  const session = await createAuth(c.env, origin).api.getSession({
    asResponse: false,
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json(apiError("Unauthorized"), 401);
  }

  await next();
};

export const app = new Hono<AppBindings>()
  .use(contextStorage())
  .use(setDatabase)
  .on(["GET", "POST"], "/api/auth/*", (c) => {
    const origin = getRequestOrigin(c.req.url);
    return createAuth(c.env, origin).handler(c.req.raw);
  })
  .use("/api/v1/skills", requireAuth)
  .use("/api/v1/skills/*", requireAuth)
  .route("/", apiRoutes);
