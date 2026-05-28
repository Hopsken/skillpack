import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { skillListQueryOptions } from "@/features/skills/api/query-options";
import { useSkillList } from "@/features/skills/api/use-skill-list";
import { ForkOriginDialog } from "@/features/skills/components/fork-origin-dialog";
import { ManagedSkillsSkeleton } from "@/features/skills/components/skill-page-skeletons";
import { ManagedSkillsView } from "@/features/skills/views/managed-skills-view";

const ManagedSkillsRoute = () => {
  const skillList = useSkillList();
  const skills = skillList.data ?? [];
  const [forkDialogOpen, setForkDialogOpen] = useState(false);
  const status = skillList.isLoading
    ? "Loading skills..."
    : `${skills.length} skills loaded`;

  if (skillList.isPending) {
    return <ManagedSkillsSkeleton />;
  }

  return (
    <>
      <ManagedSkillsView
        skills={skills}
        status={status}
        onFork={() => setForkDialogOpen(true)}
        onRefresh={skillList.refetch}
      />
      <ForkOriginDialog
        open={forkDialogOpen}
        onOpenChange={setForkDialogOpen}
      />
    </>
  );
};

export const Route = createFileRoute("/_authenticated/skills/")({
  component: ManagedSkillsRoute,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(skillListQueryOptions()),
});
