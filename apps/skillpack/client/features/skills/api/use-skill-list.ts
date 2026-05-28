import { useQuery } from "@tanstack/react-query";

import { skillListQueryOptions } from "./query-options";

export const useSkillList = () =>
  useQuery({
    ...skillListQueryOptions(),
    select: (data) => data.skills,
  });
