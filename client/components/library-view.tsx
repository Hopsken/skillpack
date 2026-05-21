import { FileTextIcon, RefreshCwIcon } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { Button } from "@/components/ui/button";
import type { SkillCatalogItem } from "@shared/schemas/skills";

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

function SkillRow({ skill }: { skill: SkillCatalogItem }) {
  return (
    <article className="flex gap-5 border-b border-border px-4 py-5 last:border-b-0 hover:bg-muted/40">
      <div className="flex size-20 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground shadow-xs">
        <FileTextIcon />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold tracking-tight text-foreground">{skill.name}</h2>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{skill.description}</p>
          </div>
          <div className="shrink-0 text-sm text-muted-foreground">v{skill.version}</div>
        </div>
        <code className="mt-2 block truncate text-sm text-muted-foreground">{skill.location}</code>
      </div>
    </article>
  );
}

function EmptyLibrary({ status, onRefresh }: Pick<LibraryViewProps, "status" | "onRefresh">) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card px-6 text-center">
      <FileTextIcon className="text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold tracking-tight">No skills yet</h2>
        <p className="max-w-md text-sm text-muted-foreground">{status}</p>
      </div>
      <Button variant="secondary" onClick={onRefresh}>
        <RefreshCwIcon data-icon="inline-start" />
        Refresh catalog
      </Button>
    </div>
  );
}
