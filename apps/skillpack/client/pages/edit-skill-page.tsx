import type {
  CreateSkillInput,
  PatchSkillInput,
} from "@skillpack/contracts/skills/requests";
import { Navigate, useNavigate, useParams } from "react-router";

import {
  SkillFormView,
  useLatestSkill,
  usePatchSkill,
} from "@/features/skills";

const getSkillLoadStatus = (
  skill: { name: string; version: number } | undefined,
  isLoading: boolean
) => {
  if (isLoading) {
    return "Loading skill...";
  }

  if (skill) {
    return `Loaded ${skill.name} v${skill.version}`;
  }

  return "Skill unavailable";
};

export const EditSkillPage = () => {
  const { skillId: skillIdParam } = useParams();
  const skillId = skillIdParam ? Number(skillIdParam) : undefined;
  const { isLoading, skill } = useLatestSkill(skillId);
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
      status={getSkillLoadStatus(skill, isLoading)}
      onSubmit={submit}
    />
  );
};
