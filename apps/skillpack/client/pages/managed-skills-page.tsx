import { useState } from "react";

import {
  ForkOriginDialog,
  ManagedSkillsView,
  useSkillList,
} from "@/features/skills";

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
