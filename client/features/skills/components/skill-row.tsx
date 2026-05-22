import type { SkillListItem } from "@shared/schemas/skills";
import { Link } from "react-router";

interface SkillRowProps {
  skill: SkillListItem;
}

export const SkillRow = ({ skill }: SkillRowProps) => (
  <article className="border-b border-border last:border-b-0 hover:bg-muted/40">
    <Link
      to={`/skills/${skill.source.type}/${skill.handle}`}
      className="flex items-start justify-between gap-4 px-6 py-3"
    >
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">
          {skill.name}
        </h2>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {skill.description}
        </p>
      </div>
      <div className="shrink-0 text-xs text-muted-foreground">
        {skill.source.type} / v{skill.version}
      </div>
    </Link>
  </article>
);
