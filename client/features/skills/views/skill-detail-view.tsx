import type {
  SkillReadResponse,
  SkillVersionItem,
} from "@shared/schemas/skills";
import { ArrowLeftIcon } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useSkillFile } from "../api/use-skill-detail";

type SkillDetailTab = "skill" | "resources" | "versions";

interface SkillDetailViewProps {
  skill: SkillReadResponse | undefined;
  versions: SkillVersionItem[];
  versionsStatus: string;
  activeTab: SkillDetailTab;
  onTabChange: (tab: SkillDetailTab) => void;
}

interface ResourcesPanelProps {
  skill: SkillReadResponse | undefined;
  selectedPath: string | undefined;
  fileContent: string | undefined;
  fileStatus: string;
  onSelectPath: (path: string) => void;
}

interface VersionsPanelProps {
  skill: SkillReadResponse | undefined;
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
    "block w-full border-b border-border px-6 py-3 text-left text-sm",
    isSelected
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
  );

const getVersionClassName = (isCurrent: boolean) =>
  cn(
    "flex items-center justify-between border-b border-border px-6 py-3 text-sm hover:bg-muted/40",
    isCurrent && "bg-muted/60"
  );

const SkillMarkdownPanel = ({
  skill,
}: {
  skill: SkillReadResponse | undefined;
}) => (
  <section className="prose prose-neutral max-w-4xl px-6 py-8 dark:prose-invert">
    {skill?.content ? (
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {skill.content}
      </ReactMarkdown>
    ) : (
      <p className="text-muted-foreground">No skill content loaded.</p>
    )}
  </section>
);

const ResourcesPanel = ({
  skill,
  selectedPath,
  fileContent,
  fileStatus,
  onSelectPath,
}: ResourcesPanelProps) => (
  <section className="grid min-h-full grid-cols-[minmax(16rem,24rem)_1fr]">
    <div className="border-r border-border">
      {skill?.resources.length ? (
        skill.resources.map((resource) => (
          <button
            type="button"
            key={resource.path}
            onClick={() => onSelectPath(resource.path)}
            className={getResourceClassName(selectedPath === resource.path)}
          >
            <span className="block truncate font-medium">{resource.path}</span>
            <span className="text-xs">{resource.mediaType}</span>
          </button>
        ))
      ) : (
        <p className="px-6 py-4 text-sm text-muted-foreground">
          No resources for this skill version.
        </p>
      )}
    </div>
    <div className="min-w-0 px-6 py-4">
      <p className="mb-3 text-sm text-muted-foreground">{fileStatus}</p>
      {fileContent ? (
        <pre className="whitespace-pre-wrap text-sm leading-6 text-foreground">
          {fileContent}
        </pre>
      ) : null}
    </div>
  </section>
);

const VersionsPanel = ({
  skill,
  versions,
  versionsStatus,
}: VersionsPanelProps) => (
  <section>
    {versions.length ? (
      versions.map((version) => (
        <Link
          key={version.version}
          to={`/skills/${skill?.name ?? ""}/v/${version.version}?tab=versions`}
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
  versions,
  versionsStatus,
  activeTab,
  onTabChange,
}: SkillDetailViewProps) => {
  const [selectedResourcePath, setSelectedResourcePath] = useState<string>();
  const { file, status: fileStatus } = useSkillFile(
    skill?.name,
    skill?.version,
    selectedResourcePath
  );

  useEffect(() => {
    setSelectedResourcePath(undefined);
  }, [skill?.name, skill?.version]);

  return (
    <main className="flex h-svh min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/library" aria-label="Back to library">
              <ArrowLeftIcon />
            </Link>
          </Button>
          <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight">
            {skill?.name ?? "Skill"}
          </h1>
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
            fileContent={file?.content}
            fileStatus={fileStatus}
            onSelectPath={setSelectedResourcePath}
          />
        )}
        {activeTab === "versions" && (
          <VersionsPanel
            skill={skill}
            versions={versions}
            versionsStatus={versionsStatus}
          />
        )}
      </OverlayScrollbarsComponent>
    </main>
  );
};

export type { SkillDetailTab };
