import type { SkillListItem } from "@skillpack/contracts/skills/responses";
import { useQuery } from "@tanstack/react-query";

import { fetchSkillList, skillListQueryKey } from "./queries";

export interface SkillListState {
  isLoading: boolean;
  skills: SkillListItem[];
  refresh: () => Promise<void>;
}

export const useSkillList = (): SkillListState => {
  const query = useQuery({
    queryFn: fetchSkillList,
    queryKey: skillListQueryKey,
  });

  const skills = query.data?.skills ?? [];

  const refresh = async (): Promise<void> => {
    await query.refetch();
  };

  return { isLoading: query.isLoading, refresh, skills };
};
