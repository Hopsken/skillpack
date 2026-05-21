import { Hono } from "hono";
import type { AppBindings } from "../types";

export const healthRoute = new Hono<AppBindings>().get("/health", (c) => c.json({ ok: true }));
