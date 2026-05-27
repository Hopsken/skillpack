import { useState } from "react";

import { useSkillList } from "@/features/skills/api/use-skill-list";
import { ForkOriginDialog } from "@/features/skills/components/fork-origin-dialog";
import { ManagedSkillsView } from "@/features/skills/views/managed-skills-view";

export const ManagedSkillsPage = () => {
  const { isLoading, skills, refresh } = useSkillList();
  const [forkDialogOpen, setForkDialogOpen] = useState(false);
  const status = isLoading
    ? "Loading skills..."
    : `${skills.length} skills loaded`;

  return (
    <>
      <ManagedSkillsView
        skills={skills}
        status={status}
        onFork={() => setForkDialogOpen(true)}
        onRefresh={refresh}
      />
      <ForkOriginDialog
        open={forkDialogOpen}
        onOpenChange={setForkDialogOpen}
      />
    </>
  );
};
