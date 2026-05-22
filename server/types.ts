import type { createDb } from "./db/client";

export type Database = ReturnType<typeof createDb>;

export interface AppBindings {
  Bindings: Env;
  Variables: {
    db: Database;
  };
}
