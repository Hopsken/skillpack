import type { ForkSkillInput } from "@shared/contract/skills/requests";
import { useNavigate } from "react-router";

import { SkillForkView, useForkSkill } from "@/features/skills";

export const ForkSkillPage = () => {
  const forkSkill = useForkSkill();
  const navigate = useNavigate();

  const submit = async (input: ForkSkillInput) => {
    const forked = await forkSkill.mutateAsync(input);
    navigate(`/skills/${forked.id}`);
  };

  return <SkillForkView status="Review source before use" onSubmit={submit} />;
};
