import type {
  OriginSelectionInput,
  SkillOriginInput,
} from "@skillpack/contracts/origins/requests";
import type { ReadSkillDefinitionsResponse } from "@skillpack/contracts/origins/responses";
import { useQuery } from "@tanstack/react-query";

import { getOriginQueryKeyPart } from "../lib/origin-url";
import { originDefinitionQueryKey, readSkillDefinitions } from "./queries";

const definitionStaleTimeMs = 60_000;

type ReadSkillDefinitionResult =
  ReadSkillDefinitionsResponse["results"][number];

export interface OriginSkillDefinitionState {
  error: Error | null;
  isLoading: boolean;
  result: ReadSkillDefinitionResult | undefined;
}

export const useOriginSkillDefinition = (
  origin: SkillOriginInput | undefined,
  selection: OriginSelectionInput | undefined
): OriginSkillDefinitionState => {
  const originKey = origin ? getOriginQueryKeyPart(origin) : undefined;
  const query = useQuery({
    enabled: Boolean(origin && selection),
    queryFn: async (): Promise<ReadSkillDefinitionResult> => {
      if (!(origin && selection)) {
        throw new Error("Missing Skill Origin Definition Input");
      }

      const response = await readSkillDefinitions({
        origin,
        selections: [selection],
      });
      const result = response.results.at(0);

      if (!result) {
        throw new Error("Missing Skill Origin Definition Result");
      }

      return result;
    },
    queryKey: originDefinitionQueryKey(originKey, selection?.skillName),
    staleTime: definitionStaleTimeMs,
  });

  return {
    error: query.error,
    isLoading: query.isLoading,
    result: query.data,
  };
};
