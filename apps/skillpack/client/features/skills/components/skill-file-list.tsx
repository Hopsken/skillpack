import { PlusIcon, Trash2Icon, Undo2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { getFileStatus } from "../lib/resource-draft-session";
import type { ResourceDraftSession } from "../lib/resource-draft-session";
import { canDeleteFile } from "../lib/skill-files";
import type { SkillFile } from "../lib/skill-files";

interface SkillFileListProps {
  files: SkillFile[];
  isEditing: boolean;
  selectedPath: string | undefined;
  session: ResourceDraftSession;
  onAddClick: () => void;
  onDeletePath: (path: string) => void;
  onSelectPath: (path: string) => void;
}

const getFileClassName = (isSelected: boolean, isDeleted: boolean) =>
  cn(
    "flex min-h-14 w-full items-center border-b border-border px-4 text-left text-sm",
    isDeleted && "bg-destructive/10 text-destructive",
    !isDeleted &&
      (isSelected
        ? "bg-muted text-foreground"
        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"),
    isDeleted && isSelected && "bg-destructive/15"
  );

const getStatusBadgeVariant = (status: string) =>
  status === "deleted" ? "destructive" : "secondary";

const SkillFileListHeader = ({
  isEditing,
  onAddClick,
}: {
  isEditing: boolean;
  onAddClick: () => void;
}) => (
  <div className="flex min-h-14 items-center justify-between border-b border-border px-4 text-sm font-medium text-muted-foreground">
    <span>Files</span>
    {isEditing ? (
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Add file"
        onClick={onAddClick}
      >
        <PlusIcon />
      </Button>
    ) : null}
  </div>
);

const EmptySkillFileList = () => (
  <p className="px-6 py-4 text-sm text-muted-foreground">
    No files for this skill version.
  </p>
);

const SkillFileListItem = ({
  file,
  isEditing,
  isSelected,
  session,
  onDeletePath,
  onSelectPath,
}: {
  file: SkillFile;
  isEditing: boolean;
  isSelected: boolean;
  session: ResourceDraftSession;
  onDeletePath: (path: string) => void;
  onSelectPath: (path: string) => void;
}) => {
  const status = getFileStatus(file.path, session);
  const isDeleted = status === "deleted";
  const showDelete = isEditing && canDeleteFile(file);
  const showBadge = status !== "clean";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onSelectPath(file.path)}
        className={getFileClassName(isSelected, isDeleted)}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 pr-8">
          <span className="truncate font-medium" title={file.path}>
            {file.path}
          </span>
          {showBadge ? (
            <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>
          ) : null}
        </span>
      </button>
      {showDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={
            isDeleted ? `Undo delete ${file.path}` : `Delete ${file.path}`
          }
          className="absolute top-1/2 right-2 -translate-y-1/2"
          onClick={() => onDeletePath(file.path)}
        >
          {isDeleted ? <Undo2Icon /> : <Trash2Icon />}
        </Button>
      ) : null}
    </div>
  );
};

export const SkillFileList = ({
  files,
  isEditing,
  selectedPath,
  session,
  onAddClick,
  onDeletePath,
  onSelectPath,
}: SkillFileListProps) => (
  <>
    <SkillFileListHeader isEditing={isEditing} onAddClick={onAddClick} />
    {files.length ? (
      files.map((file) => (
        <SkillFileListItem
          key={file.path}
          file={file}
          isEditing={isEditing}
          isSelected={selectedPath === file.path}
          session={session}
          onDeletePath={onDeletePath}
          onSelectPath={onSelectPath}
        />
      ))
    ) : (
      <EmptySkillFileList />
    )}
  </>
);
