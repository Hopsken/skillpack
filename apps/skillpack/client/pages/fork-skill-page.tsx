import type { ForkSkillInput } from "@skillpack/contracts/skills/requests";
import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import {
  ForkOriginDialog,
  SkillForkView,
  useForkSkill,
  useOriginDiscovery,
  useSkillList,
} from "@/features/skills";
import { parseOriginSearchParams } from "@/features/skills/lib/origin-url";

const getDiscoveryStatus = (skillCount: number, isLoading: boolean) => {
  if (isLoading) {
    return "Discovering...";
  }

  if (skillCount === 0) {
    return "No skills found.";
  }

  return `Found ${skillCount} skills`;
};

export const ForkSkillPage = () => {
  const forkSkill = useForkSkill();
  const forkSkillAsync = forkSkill.mutateAsync;
  const navigate = useNavigate();
  const skillList = useSkillList();
  const [searchParams] = useSearchParams();
  const origin = useMemo(
    () => parseOriginSearchParams(searchParams),
    [searchParams]
  );
  const discovery = useOriginDiscovery(origin);
  const [forkDialogOpen, setForkDialogOpen] = useState(!origin);

  const submit = useCallback(
    async (input: ForkSkillInput) => {
      await forkSkillAsync(input);
    },
    [forkSkillAsync]
  );

  const discoveredSkillCount = discovery.discovery?.candidates.length ?? 0;
  const existingSkillNames = useMemo(
    () => skillList.skills.map((skill) => skill.name),
    [skillList.skills]
  );
  const discoveryStatus = getDiscoveryStatus(
    discoveredSkillCount,
    discovery.isLoading
  );

  if (!origin) {
    return (
      <main className="flex h-svh min-w-0 flex-1 flex-col bg-background">
        <header className="flex h-16 shrink-0 items-center border-b border-border bg-background px-6">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            Add from GitHub
          </h1>
        </header>
        <section className="flex flex-1 items-center justify-center px-6">
          <Button onClick={() => setForkDialogOpen(true)}>
            Choose Repository
          </Button>
        </section>
        <ForkOriginDialog
          open={forkDialogOpen}
          onOpenChange={setForkDialogOpen}
        />
      </main>
    );
  }

  return (
    <>
      <SkillForkView
        discovery={discovery.discovery}
        existingSkillNames={existingSkillNames}
        origin={origin}
        status={discoveryStatus}
        onComplete={() => navigate("/skills")}
        onSubmit={submit}
      />
      <ForkOriginDialog
        open={forkDialogOpen}
        onOpenChange={setForkDialogOpen}
      />
    </>
  );
};
