import { Hono } from "hono";

import { healthRoute } from "./routes/health";
import { skillsRoute } from "./routes/skills";
import type { AppBindings } from "./types";

export const app = new Hono<AppBindings>()
  .route("/api", healthRoute)
  .route("/api/v1/skills", skillsRoute);
