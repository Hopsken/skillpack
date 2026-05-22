import type { ResolvedSkill, SkillVersionItem } from "@shared/schemas/skills";
import { ArrowLeftIcon } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useSkillFile } from "../api/use-skill-detail";
import { MarkdownContent } from "../components/markdown-content";
import { getSkillResourceKind } from "../lib/resource-kind";

type SkillDetailTab = "skill" | "resources" | "versions";

const loadResourceViewer = async () => {
  const module = await import("../components/resource-viewer");
  return { default: module.ResourceViewer };
};

const ResourceViewer = lazy(loadResourceViewer);

interface SkillDetailViewProps {
  skill: ResolvedSkill | undefined;
  skillHandle: string;
  versions: SkillVersionItem[];
  versionsStatus: string;
  activeTab: SkillDetailTab;
  onTabChange: (tab: SkillDetailTab) => void;
}

interface ResourcesPanelProps {
  skill: ResolvedSkill | undefined;
  selectedPath: string | undefined;
  fileContentStatus: string;
  onSelectPath: (path: string) => void;
}

interface VersionsPanelProps {
  skill: ResolvedSkill | undefined;
  skillHandle: string;
  versions: SkillVersionItem[];
  versionsStatus: string;
}

const tabs = [
  { id: "skill", label: "SKILL.md" },
  { id: "resources", label: "Resources" },
  { id: "versions", label: "Versions" },
] as const;

const getTabClassName = (isActive: boolean) =>
  cn(
    "border-b-2 px-3 py-3 text-sm font-medium",
    isActive
      ? "border-foreground text-foreground"
      : "border-transparent text-muted-foreground hover:text-foreground"
  );

const getResourceClassName = (isSelected: boolean) =>
  cn(
    "block w-full border-b border-border px-4 py-3 text-left text-sm",
    isSelected
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
  );

const getVersionClassName = (isCurrent: boolean) =>
  cn(
    "flex items-center justify-between border-b border-border px-6 py-3 text-sm hover:bg-muted/40",
    isCurrent && "bg-muted/60"
  );

const getRawResourceUrl = (
  name: string | undefined,
  version: string | undefined,
  path: string | undefined
) => {
  if (!(name && version && path)) {
    return;
  }

  const searchParams = new URLSearchParams({ path, version });
  return `/api/v1/skills/skillpack/${encodeURIComponent(name)}/resources/raw?${searchParams}`;
};

const SkillMarkdownPanel = ({
  skill,
}: {
  skill: ResolvedSkill | undefined;
}) => (
  <MarkdownContent
    content={skill?.content}
    fallback="No skill content loaded."
  />
);

const ResourcesPanel = ({
  skill,
  selectedPath,
  fileContentStatus,
  onSelectPath,
}: ResourcesPanelProps) => {
  const selectedResource = skill?.resources.find(
    (resource) => resource.path === selectedPath
  );
  const shouldFetchFile =
    selectedResource && getSkillResourceKind(selectedResource) !== "image";
  const { file, status: fileStatus } = useSkillFile(
    skill?.handle,
    skill?.version,
    shouldFetchFile ? selectedResource.path : undefined
  );
  const rawUrl = getRawResourceUrl(
    skill?.handle,
    skill?.version,
    selectedResource?.path
  );
  const viewerStatus = selectedResource ? fileStatus : fileContentStatus;

  return (
    <section className="grid min-h-full grid-cols-[minmax(10rem,16rem)_1fr]">
      <div className="border-r border-border">
        {skill?.resources.length ? (
          skill.resources.map((resource) => (
            <button
              type="button"
              key={resource.path}
              onClick={() => onSelectPath(resource.path)}
              className={getResourceClassName(selectedPath === resource.path)}
            >
              <span
                className="block truncate font-medium"
                title={resource.path}
              >
                {resource.path}
              </span>
            </button>
          ))
        ) : (
          <p className="px-6 py-4 text-sm text-muted-foreground">
            No resources for this skill version.
          </p>
        )}
      </div>
      <div className="min-w-0">
        <Suspense
          fallback={
            <p className="px-6 py-4 text-sm text-muted-foreground">
              Loading resource viewer...
            </p>
          }
        >
          <ResourceViewer
            file={file}
            rawUrl={rawUrl}
            resource={selectedResource}
            status={viewerStatus}
          />
        </Suspense>
      </div>
    </section>
  );
};

const VersionsPanel = ({
  skill,
  skillHandle,
  versions,
  versionsStatus,
}: VersionsPanelProps) => (
  <section>
    {versions.length ? (
      versions.map((version) => (
        <Link
          key={version.version}
          to={`/skills/skillpack/${skillHandle}?version=${encodeURIComponent(version.version)}&tab=versions`}
          className={getVersionClassName(skill?.version === version.version)}
        >
          <span className="font-medium">v{version.version}</span>
          <span className="text-muted-foreground">
            {new Date(version.createdAt).toLocaleString()}
          </span>
        </Link>
      ))
    ) : (
      <p className="px-6 py-4 text-sm text-muted-foreground">
        {versionsStatus}
      </p>
    )}
  </section>
);

export const SkillDetailView = ({
  skill,
  skillHandle,
  versions,
  versionsStatus,
  activeTab,
  onTabChange,
}: SkillDetailViewProps) => {
  const [selectedResourcePath, setSelectedResourcePath] = useState<string>();
  const firstResourcePath = skill?.resources.at(0)?.path;

  useEffect(() => {
    setSelectedResourcePath(undefined);
  }, [skill?.name, skill?.version]);

  useEffect(() => {
    if (
      activeTab === "resources" &&
      !selectedResourcePath &&
      firstResourcePath
    ) {
      setSelectedResourcePath(firstResourcePath);
    }
  }, [activeTab, firstResourcePath, selectedResourcePath]);

  return (
    <main className="flex h-svh min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/library" aria-label="Back to library">
              <ArrowLeftIcon />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {skill?.name ?? "Skill"}
            </h1>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium text-foreground">
          {skill ? `v${skill.version}` : "Version"}
        </span>
      </header>

      <div className="flex h-12 shrink-0 items-end gap-1 border-b border-border px-6">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={getTabClassName(activeTab === tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <OverlayScrollbarsComponent
        defer
        options={{ scrollbars: { autoHide: "leave", theme: "os-theme-dark" } }}
        className="min-h-0 flex-1"
      >
        {activeTab === "skill" && <SkillMarkdownPanel skill={skill} />}
        {activeTab === "resources" && (
          <ResourcesPanel
            skill={skill}
            selectedPath={selectedResourcePath}
            fileContentStatus="Select a resource"
            onSelectPath={setSelectedResourcePath}
          />
        )}
        {activeTab === "versions" && (
          <VersionsPanel
            skill={skill}
            skillHandle={skillHandle}
            versions={versions}
            versionsStatus={versionsStatus}
          />
        )}
      </OverlayScrollbarsComponent>
    </main>
  );
};

export type { SkillDetailTab };
