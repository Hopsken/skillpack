import type { CreateSkillInput } from "@skillpack/contracts/skills/requests";
import { useNavigate } from "react-router";

import { useCreateSkill } from "@/features/skills/api/use-skill-mutations";
import { SkillFormView } from "@/features/skills/views/skill-form-view";

export const CreateSkillPage = () => {
  const createSkill = useCreateSkill();
  const navigate = useNavigate();

  const submit = async (input: CreateSkillInput) => {
    const created = await createSkill.mutateAsync(input);
    navigate(`/skills/${created.id}`);
  };

  return <SkillFormView status="Draft" onSubmit={submit} />;
};
