import { LibraryView, useSkillList } from "@/features/skills";

export const LibraryPage = () => {
  const { skills, status, refresh } = useSkillList();

  return <LibraryView skills={skills} status={status} onRefresh={refresh} />;
};
