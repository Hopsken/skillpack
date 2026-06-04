import type {
  ResolvedSkill,
  SkillVersionItem,
} from "@skillpack/contracts/skills/responses";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { RotateCcwIcon } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { skillFilePath } from "../lib/resource-drafts";

interface SkillVersionsSheetProps {
  open: boolean;
  selectedPath: string | undefined;
  skill: ResolvedSkill | undefined;
  skillName: string;
  versions: SkillVersionItem[];
  versionsStatus: string;
  onOpenChange: (open: boolean) => void;
  onRestoreVersion: (version: number) => Promise<void>;
}

const getVersionClassName = (isCurrent: boolean) =>
  cn(
    "flex items-center justify-between gap-3 border-b border-border px-6 py-3 text-sm hover:bg-muted/40",
    isCurrent && "bg-muted/60"
  );

export const SkillVersionsSheet = ({
  open,
  selectedPath,
  skill,
  skillName,
  versions,
  versionsStatus,
  onOpenChange,
  onRestoreVersion,
}: SkillVersionsSheetProps) => {
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
