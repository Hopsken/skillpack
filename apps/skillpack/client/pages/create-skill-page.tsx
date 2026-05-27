import type {
  CreateSkillInput,
  PatchSkillInput,
} from "@skillpack/contracts/skills/requests";
import { useNavigate } from "react-router";

import { useCreateSkill } from "@/features/skills/api/use-skill-mutations";
import { SkillFormView } from "@/features/skills/views/skill-form-view";

export const CreateSkillPage = () => {
  const createSkill = useCreateSkill();
  const navigate = useNavigate();

  const submit = async (input: CreateSkillInput | PatchSkillInput) => {
    const created = await createSkill.mutateAsync(input as CreateSkillInput);
    navigate(`/skills/${created.id}`);
  };

  return <SkillFormView mode="create" status="Draft" onSubmit={submit} />;
};
