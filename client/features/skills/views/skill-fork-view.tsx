import type { DiscoverSkillsInput } from "@shared/contract/origins/requests";
import type { DiscoverSkillsResponse } from "@shared/contract/origins/responses";
import type { ForkSkillInput } from "@shared/contract/skills/requests";
import type { ForkSkillResponse } from "@shared/contract/skills/responses";
import { ArrowLeftIcon, GitForkIcon, SearchIcon } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SkillForkViewProps {
  status: string;
  onDiscover: (input: DiscoverSkillsInput) => Promise<DiscoverSkillsResponse>;
  onSubmit: (input: ForkSkillInput) => Promise<ForkSkillResponse>;
}

const getForkSummary = (response: ForkSkillResponse) => {
  const forked = response.results.filter(
    (result) => result.status === "forked"
  );
  const failed = response.results.length - forked.length;

  if (failed === 0) {
    return `Forked ${forked.length} skill${forked.length === 1 ? "" : "s"}`;
  }

  return `Forked ${forked.length}, failed ${failed}`;
};

export const SkillForkView = ({
  status,
  onDiscover,
  onSubmit,
}: SkillForkViewProps) => {
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [discovery, setDiscovery] = useState<DiscoverSkillsResponse>();
  const [selectedSkillNames, setSelectedSkillNames] = useState<string[]>([]);
  const [versionLabel, setVersionLabel] = useState("");
  const [submitStatus, setSubmitStatus] = useState(status);
  const [forkResponse, setForkResponse] = useState<ForkSkillResponse>();

  const origin = {
    branch: branch.trim() || undefined,
    kind: "github" as const,
    repoUrl,
  };

  const discover = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitStatus("Discovering...");
    setForkResponse(undefined);

    try {
      const result = await onDiscover({ origin });
      setDiscovery(result);
      setSelectedSkillNames(
        result.candidates.map((candidate) => candidate.selection.skillName)
      );
      setSubmitStatus(`Found ${result.candidates.length} skills`);
    } catch (error) {
      setDiscovery(undefined);
      setSelectedSkillNames([]);
      setSubmitStatus(
        error instanceof Error ? error.message : "Discovery failed"
      );
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setForkResponse(undefined);
    setSubmitStatus("Forking...");

    try {
      const response = await onSubmit({
        origin,
        selections: selectedSkillNames.map((skillName) => ({ skillName })),
        versionLabel: versionLabel.trim() || undefined,
      });
      setForkResponse(response);
      setSubmitStatus(getForkSummary(response));
    } catch (error) {
      setSubmitStatus(error instanceof Error ? error.message : "Fork failed");
    }
  };

  const toggleSelection = (skillName: string) => {
    setSelectedSkillNames((current) =>
      current.includes(skillName)
        ? current.filter((selected) => selected !== skillName)
        : [...current, skillName]
    );
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
        <div className="mx-auto grid max-w-3xl gap-6 p-6">
          <form onSubmit={discover} className="grid gap-3">
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
            <div className="flex justify-end">
              <Button type="submit">
                <SearchIcon />
                Discover
              </Button>
            </div>
          </form>

          <form onSubmit={submit} className="grid gap-6">
            <section className="grid gap-3">
              <div className="grid gap-2">
                <h2 className="text-sm font-medium">Skills</h2>
                <div className="grid max-h-80 gap-2 overflow-auto rounded-md border border-border p-3">
                  {discovery?.candidates.length ? (
                    discovery.candidates.map((candidate) => (
                      <label
                        key={candidate.path ?? candidate.selection.skillName}
                        className="flex min-w-0 items-start gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${candidate.name}`}
                          className="mt-1"
                          checked={selectedSkillNames.includes(
                            candidate.selection.skillName
                          )}
                          onChange={() =>
                            toggleSelection(candidate.selection.skillName)
                          }
                        />
                        <span className="grid min-w-0 gap-1">
                          <span className="truncate font-medium">
                            {candidate.name}
                          </span>
                          {candidate.path ? (
                            <span className="truncate text-muted-foreground text-xs">
                              {candidate.path}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Discover a GitHub repository to select skills.
                    </p>
                  )}
                </div>
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
              <Button type="submit" disabled={selectedSkillNames.length === 0}>
                <GitForkIcon />
                Fork Selected
              </Button>
            </div>

            {forkResponse ? (
              <section className="grid gap-2">
                <h2 className="text-sm font-medium">Results</h2>
                <div className="grid gap-2">
                  {forkResponse.results.map((result) => (
                    <div
                      key={result.selection.skillName}
                      className="rounded-md border border-border p-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">
                          {result.selection.skillName}
                        </span>
                        <span className="text-muted-foreground">
                          {result.status}
                        </span>
                      </div>
                      {result.status === "failed" ? (
                        <p className="mt-1 text-muted-foreground">
                          {result.error}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </form>
        </div>
      </OverlayScrollbarsComponent>
    </main>
  );
};
