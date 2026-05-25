import { discoverSkillsResponseSchema } from "@shared/contract/origins/responses";

import type { OriginDiscoveryResult } from "./types";

export const presentOriginDiscovery = (result: OriginDiscoveryResult) =>
  discoverSkillsResponseSchema.parse(result);
