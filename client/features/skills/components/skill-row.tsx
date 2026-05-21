import type { SkillCatalogItem } from "@shared/schemas/skills";
import { FileTextIcon } from "lucide-react";

interface SkillRowProps {
  skill: SkillCatalogItem;
}

export const SkillRow = ({ skill }: SkillRowProps) => (
  <article className="flex gap-5 border-b border-border px-4 py-5 last:border-b-0 hover:bg-muted/40">
    <div className="flex size-20 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground shadow-xs">
      <FileTextIcon />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
            {skill.name}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {skill.description}
          </p>
        </div>
        <div className="shrink-0 text-sm text-muted-foreground">
          v{skill.version}
        </div>
      </div>
      <code className="mt-2 block truncate text-sm text-muted-foreground">
        {skill.location}
      </code>
    </div>
  </article>
);
