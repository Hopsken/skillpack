import type {
  ResolvedSkill,
  ResourceManifestItem,
  SkillVersionItem,
} from "@skillpack/contracts/skills/responses";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeftIcon, RotateCcwIcon } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { useSkillFile } from "../api/use-skill-detail";
import { getSkillResourceKind } from "../lib/resource-kind";

const skillFilePath = "SKILL.md";
const skillFileMediaType = "text/markdown";

type SkillFile = Pick<ResourceManifestItem, "mediaType" | "path" | "size"> & {
  description?: string;
  name?: string;
};

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
  selectedPath: string | undefined;
  onPathChange: (path: string | undefined) => void;
  onRestoreVersion: (version: number) => Promise<void>;
}

interface FilesPanelProps {
  files: SkillFile[];
  selectedFile: SkillFile | undefined;
  skill: ResolvedSkill | undefined;
  onSelectPath: (path: string) => void;
}

interface VersionsSheetProps {
  open: boolean;
  selectedPath: string | undefined;
  skill: ResolvedSkill | undefined;
  skillName: string;
  versions: SkillVersionItem[];
  versionsStatus: string;
  onOpenChange: (open: boolean) => void;
  onRestoreVersion: (version: number) => Promise<void>;
}

const getFileClassName = (isSelected: boolean) =>
  cn(
    "block w-full border-b border-border px-4 py-3 text-left text-sm",
    isSelected
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
  );

const getVersionClassName = (isCurrent: boolean) =>
  cn(
    "flex items-center justify-between gap-3 border-b border-border px-6 py-3 text-sm hover:bg-muted/40",
    isCurrent && "bg-muted/60"
  );

const getTextSize = (content: string) =>
  new TextEncoder().encode(content).length;

const getSkillFiles = (skill: ResolvedSkill | undefined): SkillFile[] => {
  if (!skill) {
    return [];
  }

  return [
    {
      description: skill.description,
      mediaType: skillFileMediaType,
      name: skill.name,
      path: skillFilePath,
      size: getTextSize(skill.content),
    },
    ...skill.resources.filter((resource) => resource.path !== skillFilePath),
  ];
};

const getRawResourceUrl = (
  skillName: string | undefined,
  version: number | undefined,
  path: string | undefined
) => {
  if (!(skillName && version && path && path !== skillFilePath)) {
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
    return "Loading file...";
  }

  if (file) {
    return `Loaded ${file.path}`;
  }

  return "File unavailable";
};

const FilesPanel = ({
  files,
  selectedFile,
  skill,
  onSelectPath,
}: FilesPanelProps) => {
  const isSkillFile = selectedFile?.path === skillFilePath;
  const shouldFetchFile =
    selectedFile &&
    !isSkillFile &&
    getSkillResourceKind(selectedFile) !== "image";
  const resourceFile = useSkillFile(
    skill?.name,
    skill?.version,
    shouldFetchFile ? selectedFile.path : undefined
  );
  const skillFile =
    skill && selectedFile?.path === skillFilePath
      ? {
          content: skill.content,
          mediaType: skillFileMediaType,
          path: skillFilePath,
          size: getTextSize(skill.content),
        }
      : undefined;
  const file = skillFile ?? resourceFile.data;
  const rawUrl = getRawResourceUrl(
    skill?.name,
    skill?.version,
    selectedFile?.path
  );
  const viewerStatus = selectedFile
    ? getResourceContentStatus(file, resourceFile.isLoading)
    : "Select a file";

  return (
    <section className="grid h-full min-h-0 grid-cols-[minmax(10rem,16rem)_1fr]">
      <OverlayScrollbarsComponent
        defer
        options={{ scrollbars: { autoHide: "leave", theme: "os-theme-dark" } }}
        className="min-h-0 border-r border-border"
      >
        <div className="border-b border-border px-4 py-3 text-sm font-medium text-muted-foreground">
          Files
        </div>
        {files.length ? (
          files.map((fileItem) => (
            <button
              type="button"
              key={fileItem.path}
              onClick={() => onSelectPath(fileItem.path)}
              className={getFileClassName(selectedFile?.path === fileItem.path)}
            >
              <span
                className="block truncate font-medium"
                title={fileItem.path}
              >
                {fileItem.path}
              </span>
            </button>
          ))
        ) : (
          <p className="px-6 py-4 text-sm text-muted-foreground">
            No files for this skill version.
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
              Loading file viewer...
            </p>
          }
        >
          <ResourceViewer
            file={file}
            rawUrl={rawUrl}
            resource={selectedFile}
            status={viewerStatus}
          />
        </Suspense>
      </OverlayScrollbarsComponent>
    </section>
  );
};

const VersionsSheet = ({
  open,
  selectedPath,
  skill,
  skillName,
  versions,
  versionsStatus,
  onOpenChange,
  onRestoreVersion,
}: VersionsSheetProps) => {
  const linkSearchPath =
    selectedPath && selectedPath !== skillFilePath ? selectedPath : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Versions</SheetTitle>
        </SheetHeader>
        <OverlayScrollbarsComponent
          defer
          options={{
            scrollbars: { autoHide: "leave", theme: "os-theme-dark" },
          }}
          className="min-h-0 flex-1"
        >
          {versions.length ? (
            versions.map((version) => {
              const isCurrentVersion = skill?.version === version.version;

              return (
                <div
                  key={version.version}
                  className={getVersionClassName(isCurrentVersion)}
                >
                  <Link
                    params={{ skillName }}
                    search={{ path: linkSearchPath, version: version.version }}
                    to="/skills/$skillName"
                    onClick={() => onOpenChange(false)}
                    className="grid min-w-0 flex-1 gap-1"
                  >
                    <span className="truncate font-medium">
                      v{version.version}
                      {version.label ? ` · ${version.label}` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(version.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isCurrentVersion}
                    onClick={() => {
                      void onRestoreVersion(version.version);
                    }}
                  >
                    {isCurrentVersion ? null : <RotateCcwIcon />}
                    {isCurrentVersion ? "Current" : "Restore"}
                  </Button>
                </div>
              );
            })
          ) : (
            <p className="px-6 py-4 text-sm text-muted-foreground">
              {versionsStatus}
            </p>
          )}
        </OverlayScrollbarsComponent>
      </SheetContent>
    </Sheet>
  );
};

export const SkillDetailView = ({
  skill,
  skillName,
  versions,
  versionsStatus,
  selectedPath,
  onPathChange,
  onRestoreVersion,
}: SkillDetailViewProps) => {
  const [versionSheetOpen, setVersionSheetOpen] = useState(false);
  const files = useMemo(() => getSkillFiles(skill), [skill]);
  const requestedPath = selectedPath ?? skillFilePath;
  const selectedFile = files.find((file) => file.path === requestedPath);

  useEffect(() => {
    if (skill && !selectedFile) {
      onPathChange(skillFilePath);
    }
  }, [onPathChange, selectedFile, skill]);

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVersionSheetOpen(true)}
          >
            {skill ? `v${skill.version}` : "Version"}
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <FilesPanel
          files={files}
          selectedFile={selectedFile}
          skill={skill}
          onSelectPath={onPathChange}
        />
      </div>

      <VersionsSheet
        open={versionSheetOpen}
        selectedPath={selectedFile?.path}
        skill={skill}
        skillName={skillName}
        versions={versions}
        versionsStatus={versionsStatus}
        onOpenChange={setVersionSheetOpen}
        onRestoreVersion={onRestoreVersion}
      />
    </>
  );
};
