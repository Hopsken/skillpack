import type { SkillListItem } from "@skillpack/contracts/skills/responses";
import { PlusIcon } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { EmptyManagedSkills } from "../components/empty-managed-skills";
import { SkillRow } from "../components/skill-row";
import { getLibraryActions } from "../lib/library-surface";

interface ManagedSkillsViewProps {
  skills: SkillListItem[];
  status: string;
  onFork: () => void;
  onRefresh: () => void;
}

export const ManagedSkillsView = ({
  skills,
  status,
  onFork,
  onRefresh,
}: ManagedSkillsViewProps) => {
  const libraryActions = getLibraryActions();
  const primaryAction = libraryActions.find(
    (action) => action.kind === "primary"
  );

  return (
    <>
      <header className="h-(--app-shell-header-height) shrink-0 border-b border-border bg-background px-4 md:px-6">
        <div className="flex h-full items-center gap-3">
          <SidebarTrigger className="md:hidden" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight">
              Library
            </h1>
          </div>
          {primaryAction ? (
            <Button
              type="button"
              size="icon"
              aria-label={primaryAction.label}
              title={primaryAction.label}
              onClick={onFork}
            >
              <PlusIcon />
            </Button>
          ) : null}
        </div>
      </header>

      <OverlayScrollbarsComponent
        defer
        options={{ scrollbars: { autoHide: "leave", theme: "os-theme-dark" } }}
        className="min-h-0 flex-1"
      >
        <section className="min-h-full bg-background">
          {skills.length === 0 ? (
            <div className="px-4 py-4 md:px-8 md:py-6">
              <EmptyManagedSkills status={status} onRefresh={onRefresh} />
            </div>
          ) : (
            <div>
              {skills.map((skill) => (
                <SkillRow key={skill.name} skill={skill} />
              ))}
            </div>
          )}
        </section>
      </OverlayScrollbarsComponent>
    </>
  );
};
