import type { CreateSkillInput } from "@skillpack/contracts/skills/requests";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useCreateSkill } from "@/features/skills/api/use-skill-mutations";
import { SkillFormView } from "@/features/skills/views/skill-form-view";

const CreateSkillRoute = () => {
  const createSkill = useCreateSkill();
  const navigate = useNavigate();

  const submit = async (input: CreateSkillInput) => {
    const created = await createSkill.mutateAsync(input);
    await navigate({
      params: { skillName: created.name },
      search: { path: undefined, version: undefined },
      to: "/skills/$skillName",
    });
  };

  return <SkillFormView status="Draft" onSubmit={submit} />;
};

export const Route = createFileRoute("/_authenticated/create-skill")({
  component: CreateSkillRoute,
});
