import type {
  ResolvedSkill,
  SkillVersionItem,
} from "@skillpack/contracts/skills/responses";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon, RotateCcwIcon } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { lazy, Suspense, useEffect, useState } from "react";

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
  skillName: string;
  versions: SkillVersionItem[];
  versionsStatus: string;
  activeTab: SkillDetailTab;
  onTabChange: (tab: SkillDetailTab) => void;
  onRestoreVersion: (version: number) => Promise<void>;
}

interface ResourcesPanelProps {
  skill: ResolvedSkill | undefined;
  selectedPath: string | undefined;
  fileContentStatus: string;
  onSelectPath: (path: string) => void;
}

interface VersionsPanelProps {
  skill: ResolvedSkill | undefined;
  skillName: string;
  versions: SkillVersionItem[];
  versionsStatus: string;
  onRestoreVersion: (version: number) => Promise<void>;
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
  skillName: string | undefined,
  version: number | undefined,
  path: string | undefined
) => {
  if (!(skillName && version && path)) {
    return;
  }

  const searchParams = new URLSearchParams({ path, version: String(version) });
  return `/api/v1/skills/${skillName}/resources/raw?${searchParams}`;
};

const getResourceContentStatus = (
  file: { path: string } | undefined,
  isLoading: boolean
) => {
  if (isLoading) {
    return "Loading resource...";
  }

  if (file) {
    return `Loaded ${file.path}`;
  }

  return "Resource unavailable";
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
  const skillFile = useSkillFile(
    skill?.name,
    skill?.version,
    shouldFetchFile ? selectedResource.path : undefined
  );
  const rawUrl = getRawResourceUrl(
    skill?.name,
    skill?.version,
    selectedResource?.path
  );
  const viewerStatus = selectedResource
    ? getResourceContentStatus(skillFile.data, skillFile.isLoading)
    : fileContentStatus;

  return (
    <section className="grid h-full min-h-0 grid-cols-[minmax(10rem,16rem)_1fr]">
      <OverlayScrollbarsComponent
        defer
        options={{ scrollbars: { autoHide: "leave", theme: "os-theme-dark" } }}
        className="min-h-0 border-r border-border"
      >
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
      </OverlayScrollbarsComponent>
      <OverlayScrollbarsComponent
        defer
        options={{ scrollbars: { autoHide: "leave", theme: "os-theme-dark" } }}
        className="min-h-0 min-w-0"
      >
        <Suspense
          fallback={
            <p className="px-6 py-4 text-sm text-muted-foreground">
              Loading resource viewer...
            </p>
          }
        >
          <ResourceViewer
            file={skillFile.data}
            rawUrl={rawUrl}
            resource={selectedResource}
            status={viewerStatus}
          />
        </Suspense>
      </OverlayScrollbarsComponent>
    </section>
  );
};

const VersionsPanel = ({
  skill,
  skillName,
  versions,
  versionsStatus,
  onRestoreVersion,
}: VersionsPanelProps) => (
  <section>
    {versions.length ? (
      versions.map((version) => (
        <div
          key={version.version}
          className={getVersionClassName(skill?.version === version.version)}
        >
          <Link
            params={{ skillName }}
            search={{ tab: "versions", version: version.version }}
            to="/skills/$skillName"
            className="grid min-w-0 flex-1 gap-1"
          >
            <span className="font-medium">
              v{version.version}
              {version.label ? ` · ${version.label}` : ""}
            </span>
            <span className="truncate text-muted-foreground">
              {version.description}
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-muted-foreground">
              {new Date(version.createdAt).toLocaleString()}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void onRestoreVersion(version.version);
              }}
            >
              <RotateCcwIcon />
              Restore
            </Button>
          </div>
        </div>
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
  skillName,
  versions,
  versionsStatus,
  activeTab,
  onTabChange,
  onRestoreVersion,
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
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            render={<Link to="/skills" aria-label="Back to Managed Skills" />}
          >
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {skill?.name ?? "Skill"}
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium text-foreground">
            {skill ? `v${skill.version}` : "Version"}
          </span>
        </div>
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

      {activeTab === "resources" ? (
        <div className="min-h-0 flex-1">
          <ResourcesPanel
            skill={skill}
            selectedPath={selectedResourcePath}
            fileContentStatus="Select a resource"
            onSelectPath={setSelectedResourcePath}
          />
        </div>
      ) : (
        <OverlayScrollbarsComponent
          defer
          options={{
            scrollbars: { autoHide: "leave", theme: "os-theme-dark" },
          }}
          className="min-h-0 flex-1"
        >
          {activeTab === "skill" && <SkillMarkdownPanel skill={skill} />}
          {activeTab === "versions" && (
            <VersionsPanel
              skill={skill}
              skillName={skillName}
              versions={versions}
              versionsStatus={versionsStatus}
              onRestoreVersion={onRestoreVersion}
            />
          )}
        </OverlayScrollbarsComponent>
      )}
    </>
  );
};

export type { SkillDetailTab };
