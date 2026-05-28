import type { SkillListItem } from "@skillpack/contracts/skills/responses";
import { useQuery } from "@tanstack/react-query";

import { skillListQueryOptions } from "./queries";

export interface SkillListState {
  isFetching: boolean;
  isLoading: boolean;
  isPending: boolean;
  skills: SkillListItem[];
  refresh: () => Promise<void>;
}

export const useSkillList = (): SkillListState => {
  const query = useQuery({
    ...skillListQueryOptions(),
  });

  const skills = query.data?.skills ?? [];

  const refresh = async (): Promise<void> => {
    await query.refetch();
  };

  return {
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    isPending: query.isPending,
    refresh,
    skills,
  };
};
