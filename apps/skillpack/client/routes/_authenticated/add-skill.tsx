import { skillOriginSchema } from "@skillpack/contracts/origins/requests";
import type { ForkSkillInput } from "@skillpack/contracts/skills/requests";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  ForkOriginDialog,
  SkillForkView,
  useForkSkill,
  useOriginDiscovery,
  useSkillList,
} from "@/features/skills";

const noForkOriginSearchSchema = z.object({
  branch: z.undefined().optional(),
  kind: z.undefined().optional(),
  packageName: z.undefined().optional(),
  repoUrl: z.undefined().optional(),
  rev: z.undefined().optional(),
  version: z.undefined().optional(),
});
const forkSkillSearchSchema = z.union([
  skillOriginSchema,
  noForkOriginSearchSchema,
]);

const getDiscoveryStatus = (skillCount: number, isLoading: boolean) => {
  if (isLoading) {
    return "Discovering...";
  }

  if (skillCount === 0) {
    return "No skills found.";
  }

  return `Found ${skillCount} skills`;
};

/* eslint-disable no-use-before-define -- Route exposes typed route-local hooks from the file route declared below. */
const ForkSkillRoute = () => {
  const forkSkill = useForkSkill();
  const forkSkillAsync = forkSkill.mutateAsync;
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  /* eslint-enable no-use-before-define */
  const skillList = useSkillList();
  const origin = search.kind ? search : undefined;
  const discovery = useOriginDiscovery(origin);
  const discoveredSkills = discovery.data?.candidates ?? [];
  const [forkDialogOpen, setForkDialogOpen] = useState(!origin);

  const submit = useCallback(
    async (input: ForkSkillInput) => {
      await forkSkillAsync(input);
    },
    [forkSkillAsync]
  );

  const discoveredSkillCount = discoveredSkills.length;
  const existingSkillNames = useMemo(
    () => (skillList.data ?? []).map((skill) => skill.name),
    [skillList.data]
  );
  const discoveryStatus = getDiscoveryStatus(
    discoveredSkillCount,
    discovery.isLoading
  );

  if (!origin) {
    return (
      <>
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
      </>
    );
  }

  return (
    <>
      <SkillForkView
        discovery={discovery.data}
        existingSkillNames={existingSkillNames}
        origin={origin}
        status={discoveryStatus}
        onComplete={() => {
          void navigate({ to: "/skills" });
        }}
        onSubmit={submit}
      />
      <ForkOriginDialog
        open={forkDialogOpen}
        onOpenChange={setForkDialogOpen}
      />
    </>
  );
};

export const Route = createFileRoute("/_authenticated/add-skill")({
  component: ForkSkillRoute,
  validateSearch: zodValidator(forkSkillSearchSchema),
});
