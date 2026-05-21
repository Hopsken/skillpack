import { RefreshCwIcon } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { Button } from "@/components/ui/button";
import type { SkillCatalogItem } from "@shared/schemas/skills";
import { EmptyLibrary } from "../components/empty-library";
import { SkillRow } from "../components/skill-row";

type LibraryViewProps = {
  skills: SkillCatalogItem[];
  status: string;
  onRefresh: () => void;
};

export function LibraryView({ skills, status, onRefresh }: LibraryViewProps) {
  return (
    <main className="flex h-svh min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="text-muted-foreground">▥</span>
          <span>Library</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-sm text-muted-foreground md:block">{status}</div>
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCwIcon data-icon="inline-start" />
            Refresh
          </Button>
        </div>
      </header>

      <OverlayScrollbarsComponent
        defer
        options={{ scrollbars: { autoHide: "leave", theme: "os-theme-dark" } }}
        className="min-h-0 flex-1"
      >
        <section className="px-6 py-4">
          {skills.length === 0 ? (
            <EmptyLibrary status={status} onRefresh={onRefresh} />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              {skills.map((skill) => (
                <SkillRow key={skill.location} skill={skill} />
              ))}
            </div>
          )}
        </section>
      </OverlayScrollbarsComponent>
    </main>
  );
}
