import { Hono } from "hono";
import type { Context, Next } from "hono";

import { createAuth } from "./auth";
import { apiError } from "./lib/http";
import { healthRoute } from "./routes/health";
import { skillsRoute } from "./routes/skills";
import type { AppBindings } from "./types";

const getRequestOrigin = (url: string) => new URL(url).origin;

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
  .on(["GET", "POST"], "/api/auth/*", (c) => {
    const origin = getRequestOrigin(c.req.url);
    return createAuth(c.env, origin).handler(c.req.raw);
  })
  .route("/api", healthRoute)
  .use("/api/v1/skills", requireAuth)
  .use("/api/v1/skills/*", requireAuth)
  .route("/api/v1/skills", skillsRoute);
