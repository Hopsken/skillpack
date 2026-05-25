import type {
  CreateSkillInput,
  PatchSkillInput,
} from "@shared/contract/skills/requests";
import { Navigate, useNavigate, useParams } from "react-router";

import {
  SkillFormView,
  useLatestSkill,
  usePatchSkill,
} from "@/features/skills";

export const EditSkillPage = () => {
  const { skillId: skillIdParam } = useParams();
  const skillId = skillIdParam ? Number(skillIdParam) : undefined;
  const { skill, status } = useLatestSkill(skillId);
  const patchSkill = usePatchSkill(skillId);
  const navigate = useNavigate();

  if (!(skillId && Number.isInteger(skillId))) {
    return <Navigate to="/skills" replace />;
  }

  const submit = async (input: CreateSkillInput | PatchSkillInput) => {
    const patched = await patchSkill.mutateAsync(input as PatchSkillInput);
    navigate(`/skills/${patched.id}?version=${patched.currentVersion}`);
  };

  return (
    <SkillFormView
      mode="edit"
      skill={skill}
      status={status}
      onSubmit={submit}
    />
  );
};
