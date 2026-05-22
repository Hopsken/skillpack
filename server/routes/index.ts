import { Hono } from "hono";

import { skillsRoute } from "../modules/skills/route";
import type { AppBindings } from "../types";
import { healthRoute } from "./health";

export const apiRoutes = new Hono<AppBindings>()
  .route("/api", healthRoute)
  .route("/api/v1/skills", skillsRoute);
