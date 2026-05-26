# Frontend Structure Guidelines

This document defines where frontend files should live under `apps/skillpack/client/`. The goal is to keep module responsibilities and boundaries clear, so developers can quickly find the relevant files without rethinking the structure each time.

## UI Framework

The frontend uses **Tailwind CSS v4** for styling and **shadcn/ui** components installed into `components/ui/`. No MUI or Emotion.

- shadcn components live in `apps/skillpack/client/components/ui/` and are re-exported from `apps/skillpack/client/components/ui/index.ts`.
- Use Tailwind utility classes for layout and one-off styling. Use shadcn component variants before custom styles.
- Use semantic color tokens (`bg-background`, `text-muted-foreground`) — never raw `bg-blue-500`.
- Charts use **Recharts** (not shadcn Charts).

The preferred structure is:

```text
apps/skillpack/client/
  app.tsx
  main.tsx
  styles.css

  pages/        # route entry points; intentionally thin
  features/     # user workflows, state orchestration, feature-specific API hooks
  domain/       # business models and pure business logic
  components/      # reusable business UI blocks
  components/ui/   # shadcn/ui components
  shared/       # generic app infrastructure and utilities
```

Use this rule of thumb:

- `pages/`: route boundary.
- `features/`: user-visible workflows and interaction state.
- `domain/`: business concepts, rules, validation, transformation, serialization.
- `components/`: reusable, business-aware UI blocks.
- `shared/`: generic utilities, hooks, components, and API infrastructure with no BI-specific meaning.

## Dependency Direction

Allowed dependency direction:

```text
pages
  -> features
  -> components
  -> domain
  -> shared

pages may also import components and shared directly when the route really is just composition.
features may also import domain and shared directly.
components may import domain and shared.
domain may import shared only when the dependency is truly generic.
shared must not import app-specific business code.
```

Do not import upward or sideways through internals:

```text
# Not allowed
domain -> components
domain -> features
components -> features
shared -> domain
features/chart-builder -> features/dashboard/internal-file
features/dashboard -> features/chart-builder/components/chart-renderer
```

When one feature needs something from another feature, either:

1. expose a deliberate public API from that feature's `index.ts`; or
2. move the shared concept down into `domain/`, `components/`, or `shared/`.

Prefer option 2 when the code is not truly owned by one workflow.

## State Management

The frontend architecture relies on a strict split between server state and client state. Mixing them is the most common way to break module boundaries.

- TanStack Query owns all server state: anything fetched from an API belongs in the Query cache.
- Keep server state fresh through invalidation after mutations or push events. Do not duplicate it into Zustand stores, and avoid polling or `staleTime` workarounds as architectural fixes.
- Zustand owns client state: UI selections, filters, drafts, modal state, and other interaction state.
- Zustand stores should live with the owning workflow under `features/<feature>/store/`. Use zustand vanilla stores (not react hooks) when possible.
- React Context is reserved for cross-cutting platform plumbing, such as providers for workspace, navigation, theme, or app shell concerns. Do not use it for general feature state.

## `pages/`

`pages/` contains route entry points. Pages should stay thin.

A page may:

- read route params/search params;
- choose page-level layout;
- render a feature view;
- provide route-level suspense/error boundaries.

A page should not:

- own complex Zustand state;
- normalize datasets;
- validate chart definitions;
- contain chart-building workflow logic;
- implement reusable chart UI.

## `features/`

`features/` contains user-visible workflows. A feature owns orchestration, screen-level state, feature-specific API hooks, and components that are only useful inside that workflow.

Typical feature structure:

```text
features/<feature-name>/
  index.ts              # public exports only
  api/                  # React Query hooks or request adapters for this workflow
  store/                # Zustand stores/slices owned by this workflow
  views/                # top-level feature views used by pages
  components/           # workflow-specific components
  lib/                  # small feature-local helpers
```

Use a feature when the code answers: "What is the user trying to do?"

Feature stores should stay local to the workflow. Do not put reusable chart model rules in a Zustand store. Put those rules in `domain/` and have the store hold the current draft state.

## `domain/`

`domain/` contains business models and pure logic. Domain code should be easy to unit test and should not depend on React, Zustand, React Router, or browser-only UI concerns.

Use `domain/` when the code answers: "What is this business concept and what rules apply to it?"

## `shared/`

`shared/` contains generic application infrastructure and utilities.

Use `shared/` for:

- generic API clients;
- current user/session hooks;
- generic page loading/error components;
- generic formatting helpers;
- hooks that are not tied to a business concept.

Do not use `shared/` as a dumping ground for cross-feature business logic. Prefer `domain/` for business rules and `components/` for reusable business UI.

## Placement Decision Table

| File kind                                  | Location                         |
| ------------------------------------------ | -------------------------------- |
| Route component                            | `pages/`                         |
| Top-level workflow view                    | `features/<feature>/views/`      |
| Zustand store for one workflow             | `features/<feature>/store/`      |
| React Query hook used only by one workflow | `features/<feature>/api/`        |
| Component used only by one workflow        | `features/<feature>/components/` |
| Current user/session API                   | `shared/api/`                    |
| Generic formatting helpers                 | `shared/utils/`                  |

## Naming and Export Rules

- Use kebab-case for file and directory names.
- Use PascalCase for React component exports.
- Each `features/<feature>/index.ts` and `domain/<domain>/index.ts` should expose the intended public API.
- Prefer imports from public `index.ts` files across module boundaries.
- Tests for pure domain logic should live next to the domain file or in a nearby `__tests__/` directory.
