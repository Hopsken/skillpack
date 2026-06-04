import type { SkillListItem } from "@skillpack/contracts/skills/responses";
import { Link } from "@tanstack/react-router";

interface SkillRowProps {
  skill: SkillListItem;
}

export const SkillRow = ({ skill }: SkillRowProps) => (
  <article className="rounded-3xl border border-border bg-card transition-colors hover:bg-muted/20">
    <Link
      params={{ skillName: skill.name }}
      search={{ path: undefined, version: undefined }}
      to="/skills/$skillName"
      className="flex min-h-28 flex-col gap-4 p-4 md:min-h-0 md:flex-row md:items-start md:justify-between md:gap-6 md:p-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 md:hidden">
          <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
            {skill.name}
          </h2>
          <div className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            v{skill.currentVersion}
          </div>
        </div>
        <h2 className="hidden truncate text-base font-semibold tracking-tight text-foreground md:block">
          {skill.name}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground md:mt-1 md:line-clamp-1">
          {skill.description}
        </p>
      </div>
      <div className="hidden shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground md:block">
        v{skill.currentVersion}
      </div>
    </Link>
  </article>
);
