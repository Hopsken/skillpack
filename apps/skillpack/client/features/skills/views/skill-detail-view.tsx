import type { PatchSkillInput } from "@skillpack/contracts/skills/requests";
import type {
  ResolvedSkill,
  SkillVersionItem,
} from "@skillpack/contracts/skills/responses";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { SkillDetailFilesPanel } from "../components/skill-detail-files-panel";
import { SkillVersionsSheet } from "../components/skill-versions-sheet";
import { getChangeCount } from "../lib/resource-draft-session";
import {
  buildResourcePatchInput,
  getTextResourceMediaType,
  skillFilePath,
} from "../lib/resource-drafts";
import { getSkillFiles, getTextSize } from "../lib/skill-files";
import {
  getSkillResourceEditSession,
  useSkillResourceEditStore,
} from "../store/skill-resource-edit-store";

interface SkillDetailViewProps {
  skill: ResolvedSkill | undefined;
  skillName: string;
  versions: SkillVersionItem[];
  versionsStatus: string;
  selectedPath: string | undefined;
  onPathChange: (path: string | undefined) => void;
  onRestoreVersion: (version: number) => Promise<void>;
  onSaveChanges: (input: PatchSkillInput) => Promise<void>;
}

const getSaveStatusLabel = (
  saveStatus: string,
  isSaving: boolean,
  changeCount: number
) => {
  if (isSaving || saveStatus !== "Unsaved changes") {
    return saveStatus;
  }

  const noun = changeCount === 1 ? "change" : "changes";
  return `${changeCount} unsaved ${noun}`;
};

export const SkillDetailView = ({
  skill,
  skillName,
  versions,
  versionsStatus,
  selectedPath,
  onPathChange,
  onRestoreVersion,
  onSaveChanges,
}: SkillDetailViewProps) => {
  const [versionSheetOpen, setVersionSheetOpen] = useState(false);
  const {
    addedPaths,
    addPath: addPathDraft,
    beginEdit,
    cancelEdit,
    changeDescription: changeDescriptionDraft,
    changeDraft,
    deletedPaths,
    deletePath: deletePathDraft,
    descriptionDraft,
    draftsByPath,
    isEditing,
    isSaving,
    renamedFromByPath,
    renamePath: renamePathDraft,
    resetForSkill,
    saveStatus,
    setIsSaving,
    setSaveStatus,
  } = useSkillResourceEditStore();
  const baseFiles = useMemo(() => getSkillFiles(skill), [skill]);
  const files = useMemo(() => {
    const renamedOriginalPaths = new Set(Object.values(renamedFromByPath));

    return [
      ...baseFiles.filter((file) => !renamedOriginalPaths.has(file.path)),
      ...[...addedPaths].map((path) => ({
        mediaType: getTextResourceMediaType(path),
        path,
        size: getTextSize(draftsByPath[path] ?? ""),
      })),
    ];
  }, [addedPaths, baseFiles, draftsByPath, renamedFromByPath]);
  const session = useMemo(
    () =>
      getSkillResourceEditSession({
        addedPaths,
        deletedPaths,
        descriptionDraft,
        draftsByPath,
        isEditing,
        renamedFromByPath,
      }),
    [
      addedPaths,
      deletedPaths,
      descriptionDraft,
      draftsByPath,
      isEditing,
      renamedFromByPath,
    ]
  );
  const requestedPath = selectedPath ?? skillFilePath;
  const selectedFile = files.find((file) => file.path === requestedPath);
  const changeCount = getChangeCount(session);
  const hasPendingChanges = changeCount > 0;

  useEffect(() => {
    resetForSkill();
  }, [resetForSkill, skill?.name, skill?.version]);

  useEffect(() => {
    if (skill && !selectedFile) {
      onPathChange(skillFilePath);
    }
  }, [onPathChange, selectedFile, skill]);

  useEffect(() => {
    if (!hasPendingChanges && saveStatus === "Unsaved changes") {
      setSaveStatus("No changes");
    }
  }, [hasPendingChanges, saveStatus, setSaveStatus]);

  const addPath = (path: string) => {
    addPathDraft(path);
    onPathChange(path);
  };

  const deletePath = (path: string) => {
    const result = deletePathDraft(path);

    if (result.selectedPath) {
      onPathChange(result.selectedPath);
    }
  };

  const changeDescription = (description: string) => {
    changeDescriptionDraft(description, skill?.description);
  };

  const renamePath = (path: string, nextPath: string, content: string) => {
    const result = renamePathDraft(path, nextPath, content);
    onPathChange(result.selectedPath);
  };

  const saveChanges = async () => {
    if (!hasPendingChanges) {
      return;
    }

    setIsSaving(true);
    setSaveStatus("Saving...");

    try {
      const filesByPath = new Map(files.map((file) => [file.path, file]));
      await onSaveChanges(
        buildResourcePatchInput({
          deletedPaths,
          descriptionDraft,
          draftsByPath,
          filesByPath,
          renamedFromByPath,
        })
      );
      resetForSkill();
      setSaveStatus("Saved");
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6 py-2">
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
        <div className="flex shrink-0 items-center gap-3">
          {isEditing ? (
            <>
              <p className="text-sm text-muted-foreground">
                {getSaveStatusLabel(saveStatus, isSaving, changeCount)}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSaving}
                onClick={cancelEdit}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!hasPendingChanges || isSaving}
                onClick={() => {
                  void saveChanges();
                }}
              >
                Save changes
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" onClick={beginEdit}>
              Edit
            </Button>
          )}
          {isEditing ? null : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setVersionSheetOpen(true)}
            >
              {skill ? `v${skill.version}` : "Version"}
            </Button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <SkillDetailFilesPanel
          addedPaths={addedPaths}
          deletedPaths={deletedPaths}
          descriptionValue={descriptionDraft ?? skill?.description ?? ""}
          draftsByPath={draftsByPath}
          files={files}
          isEditing={isEditing}
          selectedFile={selectedFile}
          session={session}
          skill={skill}
          onAddPath={addPath}
          onDeletePath={deletePath}
          onDescriptionChange={changeDescription}
          onDraftChange={changeDraft}
          onRenamePath={renamePath}
          onSelectPath={onPathChange}
        />
      </div>

      <SkillVersionsSheet
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
