import type {
  CreateSkillInput,
  PatchSkillInput,
} from "@shared/contract/skills/requests";
import { useNavigate } from "react-router";

import { SkillFormView, useCreateSkill } from "@/features/skills";

export const CreateSkillPage = () => {
  const createSkill = useCreateSkill();
  const navigate = useNavigate();

  const submit = async (input: CreateSkillInput | PatchSkillInput) => {
    const created = await createSkill.mutateAsync(input as CreateSkillInput);
    navigate(`/skills/${created.id}`);
  };

  return <SkillFormView mode="create" status="Draft" onSubmit={submit} />;
};
