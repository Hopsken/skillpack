import type { SkillCatalogItem } from "@shared/schemas/skills";
import { useQuery } from "@tanstack/react-query";

import { getApiErrorMessage } from "@/shared/api/client";

import { fetchSkillCatalog, skillCatalogQueryKey } from "./queries";

export interface SkillCatalogState {
  skills: SkillCatalogItem[];
  status: string;
  refresh: () => Promise<void>;
}

export const useSkillCatalog = (): SkillCatalogState => {
  const query = useQuery({
    queryFn: fetchSkillCatalog,
    queryKey: skillCatalogQueryKey,
  });

  const skills = query.data?.skills ?? [];
  const status = query.isLoading
    ? "Loading skills..."
    : getApiErrorMessage(query.error, `${skills.length} skills loaded`);

  const refresh = async (): Promise<void> => {
    await query.refetch();
  };

  return { refresh, skills, status };
};
