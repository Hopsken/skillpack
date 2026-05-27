import { Navigate, useParams } from "react-router";

export const EditSkillPage = () => {
  const { skillId: skillIdParam } = useParams();
  const skillId = skillIdParam ? Number(skillIdParam) : undefined;

  if (!(skillId && Number.isInteger(skillId))) {
    return <Navigate to="/skills" replace />;
  }

  return <Navigate to={`/skills/${skillId}`} replace />;
};
