import type { SkillOriginInput } from "@skillpack/contracts/origins/requests";
import { useQuery } from "@tanstack/react-query";

import { originDiscoveryQueryOptions } from "./query-options";

export const useOriginDiscovery = (origin: SkillOriginInput | undefined) =>
  useQuery({
    enabled: Boolean(origin),
    ...originDiscoveryQueryOptions(origin ?? { kind: "npm", packageName: "" }),
  });
