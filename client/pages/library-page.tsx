import { LibraryView, useSkillCatalog } from "@/features/skills";

export function LibraryPage() {
  const { skills, status, refresh } = useSkillCatalog();

  return <LibraryView skills={skills} status={status} onRefresh={refresh} />;
}
