import type {
  DiscoverSkillsInput,
  ReadSkillDefinitionsInput,
} from "@skillpack/contracts/origins/requests";
import type {
  DiscoverSkillsResponse,
  OriginSkillCandidate,
  OriginSkillDefinitionPreview,
  ReadSkillDefinitionsResponse,
} from "@skillpack/contracts/origins/responses";
import type { ForkSkillInput } from "@skillpack/contracts/skills/requests";
import type { ForkSkillResponse } from "@skillpack/contracts/skills/responses";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  FileTextIcon,
  GitForkIcon,
  SearchIcon,
} from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SkillForkViewProps {
  status: string;
  onDiscover: (input: DiscoverSkillsInput) => Promise<DiscoverSkillsResponse>;
  onReadDefinitions: (
    input: ReadSkillDefinitionsInput
  ) => Promise<ReadSkillDefinitionsResponse>;
  onSubmit: (input: ForkSkillInput) => Promise<ForkSkillResponse>;
}

type ForkOrigin = ForkSkillInput["origin"];

const loadResourceViewer = async () => {
  const module = await import("../components/resource-viewer");
  return { default: module.ResourceViewer };
};

const ResourceViewer = lazy(loadResourceViewer);

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

const getFormOrigin = (repoUrl: string): ForkOrigin => ({
  kind: "github",
  repoUrl,
});

const getPinnedOrigin = (
  discovery: DiscoverSkillsResponse | undefined
): ForkOrigin | undefined => {
  if (!discovery) {
    return;
  }

  if (discovery.resolvedOrigin.kind === "github") {
    return {
      branch: discovery.resolvedOrigin.branch,
      kind: "github",
      repoUrl: discovery.resolvedOrigin.repoUrl,
      rev: discovery.resolvedOrigin.rev,
    };
  }

  return discovery.resolvedOrigin;
};

const getCandidateKey = (candidate: OriginSkillCandidate) =>
  candidate.path ?? candidate.selection.skillName;

const getCandidateClassName = (isActive: boolean) =>
  cn(
    "flex min-w-0 items-start gap-3 border-b border-border px-4 py-3 text-sm",
    isActive ? "bg-muted text-foreground" : "hover:bg-muted/40"
  );

const getResultBadge = (
  result: ForkSkillResponse["results"][number] | undefined
) => {
  if (!result) {
    return null;
  }

  if (result.status === "forked") {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
        <CheckCircle2Icon className="size-3" />
        Forked
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-destructive text-xs">
      <CircleAlertIcon className="size-3" />
      Failed
    </span>
  );
};

const DefinitionFileList = ({
  definition,
  selectedPath,
  onSelectPath,
}: {
  definition: OriginSkillDefinitionPreview | undefined;
  selectedPath: string | undefined;
  onSelectPath: (path: string) => void;
}) => {
  if (!definition) {
    return (
      <p className="border-r border-border px-4 py-3 text-muted-foreground text-sm">
        Select a skill to preview its files.
      </p>
    );
  }

  return (
    <OverlayScrollbarsComponent
      defer
      options={{ scrollbars: { autoHide: "leave", theme: "os-theme-dark" } }}
      className="min-h-0 border-r border-border"
    >
      {definition.resources.map((resource) => (
        <button
          type="button"
          key={resource.path}
          onClick={() => onSelectPath(resource.path)}
          className={cn(
            "block w-full border-b border-border px-4 py-3 text-left text-sm",
            selectedPath === resource.path
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          )}
        >
          <span className="block truncate font-medium" title={resource.path}>
            {resource.path}
          </span>
        </button>
      ))}
    </OverlayScrollbarsComponent>
  );
};

const DefinitionPreview = ({
  definition,
  previewStatus,
}: {
  definition: OriginSkillDefinitionPreview | undefined;
  previewStatus: string;
}) => {
  const [selectedPath, setSelectedPath] = useState<string>();

  useEffect(() => {
    setSelectedPath(definition?.resources.at(0)?.path);
  }, [definition]);

  const selectedResource = definition?.resources.find(
    (resource) => resource.path === selectedPath
  );

  return (
    <section className="grid min-h-0 flex-1 grid-cols-[minmax(10rem,16rem)_1fr]">
      <DefinitionFileList
        definition={definition}
        selectedPath={selectedPath}
        onSelectPath={setSelectedPath}
      />
      <OverlayScrollbarsComponent
        defer
        options={{ scrollbars: { autoHide: "leave", theme: "os-theme-dark" } }}
        className="min-h-0 min-w-0"
      >
        <Suspense
          fallback={
            <p className="px-6 py-4 text-muted-foreground text-sm">
              Loading resource viewer...
            </p>
          }
        >
          <ResourceViewer
            file={selectedResource}
            rawUrl={undefined}
            resource={selectedResource}
            status={selectedResource ? "Loading file..." : previewStatus}
          />
        </Suspense>
      </OverlayScrollbarsComponent>
    </section>
  );
};

export const SkillForkView = ({
  status,
  onDiscover,
  onReadDefinitions,
  onSubmit,
}: SkillForkViewProps) => {
  const [repoUrl, setRepoUrl] = useState("");
  const [discovery, setDiscovery] = useState<DiscoverSkillsResponse>();
  const [activeSkillName, setActiveSkillName] = useState<string>();
  const [selectedSkillNames, setSelectedSkillNames] = useState<string[]>([]);
  const [discoverStatus, setDiscoverStatus] = useState(status);
  const [previewStatus, setPreviewStatus] = useState("Discover skills first.");
  const [previewDefinition, setPreviewDefinition] =
    useState<OriginSkillDefinitionPreview>();
  const [submitStatus, setSubmitStatus] = useState("No skills selected");
  const [forkResponse, setForkResponse] = useState<ForkSkillResponse>();

  const activeCandidate = discovery?.candidates.find(
    (candidate) => candidate.selection.skillName === activeSkillName
  );
  const pinnedOrigin = useMemo(() => getPinnedOrigin(discovery), [discovery]);
  const forkOrigin = useMemo(
    () => pinnedOrigin ?? getFormOrigin(repoUrl),
    [pinnedOrigin, repoUrl]
  );
  const forkResultBySkillName = useMemo(() => {
    const results = new Map<string, ForkSkillResponse["results"][number]>();

    for (const result of forkResponse?.results ?? []) {
      results.set(result.selection.skillName, result);
    }

    return results;
  }, [forkResponse]);

  useEffect(() => {
    if (!(discovery && activeCandidate)) {
      setPreviewDefinition(undefined);
      setPreviewStatus(discovery ? "Select a skill to preview." : status);
      return;
    }

    let isMounted = true;

    const readDefinition = async () => {
      setPreviewDefinition(undefined);
      setPreviewStatus("Loading preview...");

      try {
        const response = await onReadDefinitions({
          origin: forkOrigin,
          selections: [activeCandidate.selection],
        });
        const result = response.results.at(0);

        if (!isMounted) {
          return;
        }

        if (result?.status === "resolved") {
          setPreviewDefinition(result.definition);
          setPreviewStatus("Select a file");
          return;
        }

        setPreviewStatus(result?.error ?? "Preview failed");
      } catch (error) {
        if (isMounted) {
          setPreviewStatus(
            error instanceof Error ? error.message : "Preview failed"
          );
        }
      }
    };

    void readDefinition();

    return () => {
      isMounted = false;
    };
  }, [activeCandidate, discovery, forkOrigin, onReadDefinitions, status]);

  const discover = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDiscoverStatus("Discovering...");
    setSubmitStatus("No skills selected");
    setForkResponse(undefined);
    setPreviewDefinition(undefined);

    try {
      const result = await onDiscover({
        origin: { kind: "github", repoUrl },
      });
      const firstSkillName = result.candidates.at(0)?.selection.skillName;

      setDiscovery(result);
      setActiveSkillName(firstSkillName);
      setSelectedSkillNames([]);
      setDiscoverStatus(`Found ${result.candidates.length} skills`);
      setPreviewStatus(
        firstSkillName ? "Loading preview..." : "No skills found."
      );
    } catch (error) {
      setDiscovery(undefined);
      setActiveSkillName(undefined);
      setSelectedSkillNames([]);
      setDiscoverStatus(
        error instanceof Error ? error.message : "Discovery failed"
      );
      setPreviewStatus("Discover skills first.");
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setForkResponse(undefined);
    setSubmitStatus("Forking...");

    try {
      const response = await onSubmit({
        origin: forkOrigin,
        selections: selectedSkillNames.map((skillName) => ({ skillName })),
      });
      setForkResponse(response);
      setSubmitStatus(getForkSummary(response));
    } catch (error) {
      setSubmitStatus(error instanceof Error ? error.message : "Fork failed");
    }
  };

  const toggleSelection = (skillName: string) => {
    setSelectedSkillNames((current) => {
      const next = current.includes(skillName)
        ? current.filter((selected) => selected !== skillName)
        : [...current, skillName];

      setSubmitStatus(
        next.length === 0
          ? "No skills selected"
          : `${next.length} selected for fork`
      );
      return next;
    });
  };

  return (
    <main className="flex h-svh min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center border-b border-border bg-background px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/skills" aria-label="Back to Library">
              <ArrowLeftIcon />
            </Link>
          </Button>
          <h1 className="truncate text-lg font-semibold tracking-tight">
            Fork From GitHub
          </h1>
        </div>
      </header>

      <form
        onSubmit={discover}
        className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-6"
      >
        <label
          htmlFor="fork-repository-url"
          className="shrink-0 text-sm font-medium"
        >
          Repository URL
        </label>
        <Input
          id="fork-repository-url"
          value={repoUrl}
          onChange={(event) => setRepoUrl(event.target.value)}
          placeholder="https://github.com/example/agent-skills"
          required
          className="max-w-xl"
        />
        <Button type="submit" className="shrink-0">
          <SearchIcon />
          Discover
        </Button>
        <p className="min-w-0 truncate text-muted-foreground text-sm">
          {discoverStatus}
        </p>
      </form>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(18rem,24rem)_1fr]">
        <aside className="min-h-0 border-r border-border">
          <div className="flex h-12 items-center justify-between border-b border-border px-4">
            <h2 className="text-sm font-medium">Skills</h2>
            <span className="text-muted-foreground text-xs">
              {discovery?.candidates.length ?? 0} found
            </span>
          </div>
          <OverlayScrollbarsComponent
            defer
            options={{
              scrollbars: { autoHide: "leave", theme: "os-theme-dark" },
            }}
            className="h-[calc(100%-3rem)]"
          >
            {discovery?.candidates.length ? (
              discovery.candidates.map((candidate) => {
                const { skillName } = candidate.selection;
                const result = forkResultBySkillName.get(skillName);

                return (
                  <div
                    key={getCandidateKey(candidate)}
                    className={getCandidateClassName(
                      activeSkillName === skillName
                    )}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Select ${candidate.name}`}
                      className="mt-1"
                      checked={selectedSkillNames.includes(skillName)}
                      onChange={() => toggleSelection(skillName)}
                    />
                    <div className="grid min-w-0 flex-1 gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveSkillName(skillName)}
                        className="grid min-w-0 gap-1 text-left"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium">
                            {candidate.name}
                          </span>
                          {getResultBadge(result)}
                        </span>
                        {candidate.path ? (
                          <span className="truncate text-muted-foreground text-xs">
                            {candidate.path}
                          </span>
                        ) : null}
                        {result?.status === "failed" ? (
                          <span className="line-clamp-2 text-destructive text-xs">
                            {result.error}
                          </span>
                        ) : null}
                      </button>
                      {result?.status === "forked" ? (
                        <Link
                          to={`/skills/${result.skill.id}`}
                          className="text-foreground text-xs underline-offset-4 hover:underline"
                        >
                          Open forked skill
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="px-4 py-3 text-muted-foreground text-sm">
                Discover a GitHub repository to review skills.
              </p>
            )}
          </OverlayScrollbarsComponent>
        </aside>

        <div className="flex min-h-0 flex-col">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-6">
            <FileTextIcon className="size-4 text-muted-foreground" />
            <h2 className="truncate text-sm font-medium">
              {previewDefinition?.name ?? activeCandidate?.name ?? "Preview"}
            </h2>
          </div>
          <DefinitionPreview
            definition={previewDefinition}
            previewStatus={previewStatus}
          />
        </div>
      </div>

      <form
        onSubmit={submit}
        className="flex h-16 shrink-0 items-center justify-between gap-4 border-t border-border bg-background px-6"
      >
        <p className="min-w-0 truncate text-muted-foreground text-sm">
          {submitStatus}
        </p>
        <Button type="submit" disabled={selectedSkillNames.length === 0}>
          <GitForkIcon />
          Fork Selected
        </Button>
      </form>
    </main>
  );
};
