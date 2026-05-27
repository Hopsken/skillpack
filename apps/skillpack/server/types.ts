import type { createDb } from "./db/client";
import type { OriginService } from "./modules/origins/service";
import type { SkillRepository } from "./modules/skills/repository";
import type { SkillService } from "./modules/skills/service";
import type { SkillStorage } from "./modules/skills/storage";

export type Database = ReturnType<typeof createDb>;

export interface AppBindings {
  Bindings: Env;
  Variables: {
    currentUser: { id: string };
    db: Database;
    originService: OriginService;
    skillRepository: SkillRepository;
    skillService: SkillService;
    skillStorage: SkillStorage;
  };
}
