import { skillOriginSchema } from "@skillpack/contracts/origins/requests";
import type { ForkSkillInput } from "@skillpack/contracts/skills/requests";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  ForkOriginDialog,
  SkillForkView,
  useForkSkill,
  useOriginDiscovery,
  useSkillList,
} from "@/features/skills";
import { getForkDiscoveryStatus } from "@/features/skills/lib/fork-surface";

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
  const discoveryStatus = getForkDiscoveryStatus(
    discoveredSkillCount,
    discovery.isLoading
  );

  if (!origin) {
    return (
      <>
        <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3 md:px-6 md:py-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="truncate text-lg font-semibold tracking-tight">
            Add to Library
          </h1>
        </header>
        <section className="flex flex-1 items-center justify-center px-4 py-6 md:px-6 md:py-8">
          <Card className="w-full max-w-2xl shadow-none">
            <CardHeader>
              <CardTitle>Add skills from GitHub</CardTitle>
              <CardDescription>
                Point Skillpack at a repository, discover agent skills, then add
                the ones you want into your Skill Library.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Start with a repository URL. You can preview discovered files
                before adding anything.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => setForkDialogOpen(true)}>
                Choose repository
              </Button>
            </CardFooter>
          </Card>
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
