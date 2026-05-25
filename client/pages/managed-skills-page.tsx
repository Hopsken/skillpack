import { ManagedSkillsView, useSkillList } from "@/features/skills";

export const ManagedSkillsPage = () => {
  const { skills, status, refresh } = useSkillList();

  return (
    <ManagedSkillsView skills={skills} status={status} onRefresh={refresh} />
  );
};
