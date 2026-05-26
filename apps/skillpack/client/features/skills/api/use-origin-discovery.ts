import type { SkillOriginInput } from "@skillpack/contracts/origins/requests";
import type { DiscoverSkillsResponse } from "@skillpack/contracts/origins/responses";
import { useQuery } from "@tanstack/react-query";

import { getOriginQueryKeyPart } from "../lib/origin-url";
import { discoverOriginSkills, originDiscoveryQueryKey } from "./queries";

const discoveryStaleTimeMs = 60_000;

export interface OriginDiscoveryState {
  discovery: DiscoverSkillsResponse | undefined;
  isFetching: boolean;
  isLoading: boolean;
}

export const useOriginDiscovery = (
  origin: SkillOriginInput | undefined
): OriginDiscoveryState => {
  const originKey = origin ? getOriginQueryKeyPart(origin) : undefined;
  const query = useQuery({
    enabled: Boolean(origin),
    queryFn: () => {
      if (!origin) {
        throw new Error("Missing Skill Origin");
      }

      return discoverOriginSkills(origin);
    },
    queryKey: originDiscoveryQueryKey(originKey),
    staleTime: discoveryStaleTimeMs,
  });

  return {
    discovery: query.data,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
  };
};
