import type { SkillListItem } from "@skillpack/contracts/skills/responses";
import { Link } from "@tanstack/react-router";
import { LibraryIcon, PlusIcon } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

import { Button } from "@/components/ui/button";

import { EmptyManagedSkills } from "../components/empty-managed-skills";
import { SkillRow } from "../components/skill-row";

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
}: ManagedSkillsViewProps) => (
  <>
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <LibraryIcon className="size-4 text-muted-foreground" />
        <span>Library</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onFork}>
          <PlusIcon />
          Add
        </Button>
        <Button size="sm" render={<Link to="/skills/new" />}>
          <PlusIcon />
          New
        </Button>
      </div>
    </header>

    <OverlayScrollbarsComponent
      defer
      options={{ scrollbars: { autoHide: "leave", theme: "os-theme-dark" } }}
      className="min-h-0 flex-1"
    >
      <section>
        {skills.length === 0 ? (
          <EmptyManagedSkills status={status} onRefresh={onRefresh} />
        ) : (
          <div>
            {skills.map((skill) => (
              <SkillRow key={skill.id} skill={skill} />
            ))}
          </div>
        )}
      </section>
    </OverlayScrollbarsComponent>
  </>
);
