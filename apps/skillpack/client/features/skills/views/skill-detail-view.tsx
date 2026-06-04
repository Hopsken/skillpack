import type { PatchSkillInput } from "@skillpack/contracts/skills/requests";
import type {
  ResolvedSkill,
  SkillVersionItem,
} from "@skillpack/contracts/skills/responses";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

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
      <header className="border-b border-border bg-background px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight md:text-2xl">
                {skill?.name ?? "Skill"}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {isEditing ? (
              <>
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
              <>
                <Button type="button" size="sm" onClick={beginEdit}>
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVersionSheetOpen(true)}
                >
                  {skill ? `v${skill.version}` : "Version"}
                </Button>
              </>
            )}
          </div>
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
