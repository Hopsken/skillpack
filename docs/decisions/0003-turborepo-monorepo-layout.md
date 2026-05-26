---
status: accepted
date: 2026-05-26
decision-makers: Sean
consulted: Current Skillpack codebase, Turborepo TypeScript and internal package guidance, ADR-0001, ADR-0002
informed: Future Skillpack maintainers and coding agents
---

# ADR-0003: Adopt a Turborepo Monorepo Layout

Skillpack will use Turborepo to manage workspace task orchestration while keeping the current Cloudflare Worker plus SPA as one deployment unit.

## Context

Skillpack started as one package with `client/`, `server/`, and `shared/` at the repository root. That layout was simple, but the project now has separate concerns:

- a deployable Cloudflare Worker and Vite React SPA;
- shared frontend/backend API contracts;
- shared Skillpack primitive value schemas;
- shared TypeScript settings.

The Worker still serves both `/api/*` routes and static SPA assets, so splitting web and API into separate apps would create deployment and local-development complexity without a product boundary that requires it.

## Decision

Use a Turborepo workspace with this layout:

```text
apps/skillpack/
packages/core/
packages/contracts/
packages/typescript-config/
```

`apps/skillpack` remains the only deployment unit. It contains the existing `client/`, `server/`, migrations, Wrangler config, Vite config, and app-local scripts.

`packages/core` owns shared Skillpack primitive value schemas such as Skill ID, version number, safe resource path, Skill Name, description, version label, and change summary.

`packages/contracts` owns frontend/backend HTTP request and response contracts. It may depend on `@skillpack/core`, but `@skillpack/core` must not depend on contracts or app code.

`packages/typescript-config` owns reusable TypeScript configuration. Ultracite, Oxlint, and Oxfmt remain root-level tooling.

Workspace packages use package imports such as `@skillpack/contracts/skills/requests` and `@skillpack/core/primitives`. The old `@shared/*` alias is removed.

## Consequences

- Root scripts are orchestration entrypoints backed by Turbo or filtered pnpm package scripts.
- Each workspace package owns its own `typecheck` script. The repository no longer uses a root `tsc -b` project-reference graph as the primary typecheck path.
- Internal packages are private JIT TypeScript packages. They do not emit `dist/` artifacts for now.
- App-local aliases such as `@/*` and `@server/*` remain scoped to `apps/skillpack`.
- Cloudflare deployment behavior stays stable because the Worker, SPA assets, D1 migrations, and R2 binding config stay inside one app package.

## Alternatives Considered

### Split web and API into separate apps

Rejected for this phase. Skillpack still deploys as one Worker serving API routes and SPA assets, so separating the folders into independent apps would add Cloudflare asset and deployment coordination without a matching runtime boundary.

### Keep the app at the repository root

Rejected because it would make the repository look like a single package with extra folders instead of a clear monorepo. Moving the app to `apps/skillpack` makes future apps and packages obvious.

### Put primitives in the contracts package

Rejected because primitive Skillpack value schemas are not HTTP contracts. Keeping them in `@skillpack/core` prevents `@skillpack/contracts` from becoming the only shared package and gives future non-HTTP packages a smaller dependency target.

### Package all tooling config

Rejected for now. TypeScript settings benefit from a package because every workspace consumes them. Ultracite, Oxlint, and Oxfmt remain root-level repo policy rather than package-local application code.
