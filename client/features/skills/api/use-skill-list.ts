import type { SkillListItem } from "@shared/schemas/skills";
import { useQuery } from "@tanstack/react-query";

import { getApiErrorMessage } from "@/shared/api/client";

import { fetchSkillList, skillListQueryKey } from "./queries";

export interface SkillListState {
  skills: SkillListItem[];
  status: string;
  refresh: () => Promise<void>;
}

export const useSkillList = (): SkillListState => {
  const query = useQuery({
    queryFn: fetchSkillList,
    queryKey: skillListQueryKey,
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
