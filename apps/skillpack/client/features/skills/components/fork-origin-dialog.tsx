import { zodResolver } from "@hookform/resolvers/zod";
import type { SkillOriginInput } from "@skillpack/contracts/origins/requests";
import { githubOriginSchema } from "@skillpack/contracts/origins/requests";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRightIcon, SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

import { useOriginDiscovery } from "../api/use-origin-discovery";

interface ForkOriginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const forkOriginFormSchema = githubOriginSchema.pick({ repoUrl: true }).extend({
  repoUrl: z.string().url("Enter a valid URL."),
});
const visibleDiscoveredSkillLimit = 3;

type ForkOriginFormInput = z.infer<typeof forkOriginFormSchema>;
type GitHubOriginInput = Extract<SkillOriginInput, { kind: "github" }>;

export const ForkOriginDialog = ({
  open,
  onOpenChange,
}: ForkOriginDialogProps) => {
  const navigate = useNavigate();
  const [submittedOrigin, setSubmittedOrigin] = useState<GitHubOriginInput>();
  const form = useForm<ForkOriginFormInput>({
    defaultValues: { repoUrl: "" },
    resolver: zodResolver(forkOriginFormSchema),
  });
  const repoUrlError = form.formState.errors.repoUrl;
  const discovery = useOriginDiscovery(submittedOrigin);
  const discoveredSkills = discovery.discovery?.candidates ?? [];
  const visibleDiscoveredSkills = discoveredSkills.slice(
    0,
    visibleDiscoveredSkillLimit
  );
  const hiddenDiscoveredSkillCount =
    discoveredSkills.length - visibleDiscoveredSkills.length;
  const canContinue = discoveredSkills.length > 0;

  useEffect(() => {
    if (!submittedOrigin || !discovery.discovery) {
      return;
    }

    if (discovery.discovery.candidates.length === 0) {
      toast.info("No skills found.");
    }
  }, [discovery.discovery, submittedOrigin]);

  const continueToFork = () => {
    if (!submittedOrigin || !canContinue) {
      return;
    }

    onOpenChange(false);
    void navigate({
      search: submittedOrigin,
      to: "/skills/fork",
    });
  };

  const submit = (input: ForkOriginFormInput) => {
    setSubmittedOrigin({
      kind: "github",
      repoUrl: input.repoUrl,
    });
  };

  const updateRepoUrl = () => {
    setSubmittedOrigin(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={form.handleSubmit(submit)}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Add to Library</DialogTitle>
            <DialogDescription>
              standing on the shoulders of giants.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field data-invalid={Boolean(repoUrlError)}>
              <FieldLabel htmlFor="fork-origin-repo-url">
                Repository URL
              </FieldLabel>
              <Input
                id="fork-origin-repo-url"
                aria-invalid={Boolean(repoUrlError)}
                {...form.register("repoUrl", { onChange: updateRepoUrl })}
                placeholder="https://github.com/example/agent-skills"
              />
              <FieldError errors={[repoUrlError]} />
            </Field>
          </FieldGroup>

          {canContinue ? (
            <div
              aria-label="Discovered skills"
              className="flex flex-wrap gap-2"
            >
              {visibleDiscoveredSkills.map((candidate) => (
                <Badge
                  key={candidate.path ?? candidate.selection.skillName}
                  variant="secondary"
                  title={candidate.name}
                >
                  {candidate.name}
                </Badge>
              ))}
              {hiddenDiscoveredSkillCount > 0 ? (
                <Badge variant="outline">
                  +{hiddenDiscoveredSkillCount} more
                </Badge>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            {canContinue ? (
              <Button type="button" onClick={continueToFork}>
                <ArrowRightIcon data-icon="inline-start" />
                Continue
              </Button>
            ) : (
              <Button type="submit" disabled={discovery.isFetching}>
                {discovery.isFetching ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <SearchIcon data-icon="inline-start" />
                )}
                Discover
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
