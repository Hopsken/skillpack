import type { ForkSkillInput } from "@shared/contract/skills/requests";
import { ArrowLeftIcon, GitForkIcon } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SkillForkViewProps {
  status: string;
  onSubmit: (input: ForkSkillInput) => Promise<void>;
}

export const SkillForkView = ({ status, onSubmit }: SkillForkViewProps) => {
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [skillName, setSkillName] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [submitStatus, setSubmitStatus] = useState(status);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitStatus("Forking...");

    try {
      await onSubmit({
        branch: branch.trim() || undefined,
        repoUrl,
        skillName,
        versionLabel: versionLabel.trim() || undefined,
      });
      setSubmitStatus("Forked");
    } catch (error) {
      setSubmitStatus(error instanceof Error ? error.message : "Fork failed");
    }
  };

  return (
    <main className="flex h-svh min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/skills" aria-label="Back to Managed Skills">
              <ArrowLeftIcon />
            </Link>
          </Button>
          <h1 className="truncate text-lg font-semibold tracking-tight">
            Fork From GitHub
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{submitStatus}</p>
      </header>

      <OverlayScrollbarsComponent
        defer
        options={{ scrollbars: { autoHide: "leave", theme: "os-theme-dark" } }}
        className="min-h-0 flex-1"
      >
        <form onSubmit={submit} className="mx-auto grid max-w-3xl gap-6 p-6">
          <section className="grid gap-3">
            <label
              htmlFor="fork-repository-url"
              className="grid gap-2 text-sm font-medium"
            >
              Repository URL
              <Input
                id="fork-repository-url"
                value={repoUrl}
                onChange={(event) => setRepoUrl(event.target.value)}
                placeholder="https://github.com/example/agent-skills"
                required
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label
                htmlFor="fork-branch"
                className="grid gap-2 text-sm font-medium"
              >
                Branch
                <Input
                  id="fork-branch"
                  value={branch}
                  onChange={(event) => setBranch(event.target.value)}
                  placeholder="default branch"
                />
              </label>
              <label
                htmlFor="fork-skill-name"
                className="grid gap-2 text-sm font-medium"
              >
                Skill Name
                <Input
                  id="fork-skill-name"
                  value={skillName}
                  onChange={(event) => setSkillName(event.target.value)}
                  required
                />
              </label>
            </div>
            <label
              htmlFor="fork-version-label"
              className="grid gap-2 text-sm font-medium"
            >
              Version Label
              <Input
                id="fork-version-label"
                value={versionLabel}
                onChange={(event) => setVersionLabel(event.target.value)}
              />
            </label>
          </section>

          <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
            Fork creates a Skillpack-owned Managed Skill copy. Review the new
            skill before using it with agents.
          </p>

          <div className="flex justify-end">
            <Button type="submit">
              <GitForkIcon />
              Fork
            </Button>
          </div>
        </form>
      </OverlayScrollbarsComponent>
    </main>
  );
};
