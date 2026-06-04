---
status: accepted
date: 2026-05-28
decision-makers: Sean
consulted: Current Skillpack frontend, TanStack Router file-based routing docs, TanStack Router React Query loading guidance
informed: Future Skillpack maintainers and coding agents
---

# ADR-0006: Use TanStack Router File-Based Routing for the SPA

Skillpack will use TanStack Router's file-based router for the React SPA and integrate route loaders with TanStack Query for critical page data.

## Context

The SPA previously used React Router declarative routes with route-level lazy imports and TanStack Query hooks inside pages. That kept routes simple, but page transitions could still show a flash while the new page module and first critical query resolved.

Skillpack already treats TanStack Query as the owner of server state. The routing layer should coordinate when critical page data must be present before render, but it should not become a parallel data cache.

## Decision

Adopt TanStack Router file-based routing under `apps/skillpack/client/routes/`.

Use the TanStack Router Vite plugin to generate `client/routeTree.gen.ts`, with auto code splitting enabled. The generated route tree is committed but ignored by the formatter and linter because it is tool-managed.

Route loaders will call TanStack Query `ensureQueryData` for critical first-render data only:

- the Skill Library list;
- the active Managed Skill detail;
- login provider configuration;
- OAuth client preview.

Non-critical or slower reads remain component-level TanStack Query hooks, including Skill Snapshots, resource file content, Fork discovery, and origin definition previews.

Protected routes use a pathless authenticated route with `beforeLoad` so unauthenticated users are redirected before protected loaders run.

## Consequences

- `routes/` becomes the framework route boundary. `pages/` and `features/` remain responsible for thin page composition and workflows.
- Server state still belongs to TanStack Query; route loaders only warm or require selected query cache entries.
- The app shell can stay mounted across protected route transitions while route-level pending and error states handle child changes.
- React Router APIs should be fully removed from the client during the migration to avoid two routing stacks.

## Alternatives Considered

### Keep React Router and add more Suspense boundaries

Rejected. The app shell improvement reduced layout flashes but did not give route-level data loading or typed search validation.

### Put every read in route loaders

Rejected. Blocking on slow or optional reads such as Fork discovery and resource previews would make route entry slower and would work against existing code-splitting boundaries.

### Use TanStack Router without file-based routes

Rejected. File-based routing gives the route tree a concrete filesystem boundary and avoids maintaining a separate hand-written route registry.
