import type { SkillListItem } from "@skillpack/contracts/skills/responses";
import { Link } from "@tanstack/react-router";

interface SkillRowProps {
  skill: SkillListItem;
}

export const SkillRow = ({ skill }: SkillRowProps) => (
  <article className="border-b border-border last:border-b-0 hover:bg-muted/40">
    <Link
      params={{ skillName: skill.name }}
      search={{ tab: undefined, version: undefined }}
      to="/skills/$skillName"
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
        ID {skill.id} / v{skill.currentVersion}
      </div>
    </Link>
  </article>
);
