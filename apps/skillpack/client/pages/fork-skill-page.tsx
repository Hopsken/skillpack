import type { ForkSkillInput } from "@skillpack/contracts/skills/requests";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import {
  ForkOriginDialog,
  SkillForkView,
  useForkSkill,
  useOriginDiscovery,
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
  const [searchParams] = useSearchParams();
  const origin = useMemo(
    () => parseOriginSearchParams(searchParams),
    [searchParams]
  );
  const discovery = useOriginDiscovery(origin);
  const [forkDialogOpen, setForkDialogOpen] = useState(!origin);

  const submit = useCallback(
    (input: ForkSkillInput) => forkSkillAsync(input),
    [forkSkillAsync]
  );

  const discoveredSkillCount = discovery.discovery?.candidates.length ?? 0;
  const discoveryStatus = getDiscoveryStatus(
    discoveredSkillCount,
    discovery.isLoading
  );

  if (!origin) {
    return (
      <main className="flex h-svh min-w-0 flex-1 flex-col bg-background">
        <header className="flex h-16 shrink-0 items-center border-b border-border bg-background px-6">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            Fork From GitHub
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
        origin={origin}
        status={discoveryStatus}
        onSubmit={submit}
      />
      <ForkOriginDialog
        open={forkDialogOpen}
        onOpenChange={setForkDialogOpen}
      />
    </>
  );
};
