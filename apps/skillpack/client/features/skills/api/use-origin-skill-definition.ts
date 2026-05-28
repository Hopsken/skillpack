import type {
  OriginSelectionInput,
  SkillOriginInput,
} from "@skillpack/contracts/origins/requests";
import { useQuery } from "@tanstack/react-query";

import { originDefinitionQueryOptions } from "./query-options";

export const useOriginSkillDefinition = (
  origin: SkillOriginInput | undefined,
  selection: OriginSelectionInput | undefined
) =>
  useQuery({
    enabled: Boolean(origin && selection),
    ...originDefinitionQueryOptions(
      origin ?? { kind: "npm", packageName: "" },
      selection ?? { skillName: "" }
    ),
  });
