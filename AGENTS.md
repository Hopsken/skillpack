# Skillpack Agent Guide

## Project Overview

Skillpack is a single Cloudflare Worker service that serves both:

- Hono API routes under `/api/*`
- Vite React SPA through Cloudflare static assets

The stack is Cloudflare Workers, Hono, D1, Drizzle ORM, R2, React, Vite, Tailwind CSS, shadcn/ui-style components, TypeScript, pnpm, and Zod.

## Project Layout

```text
client/   # Vite React SPA
server/   # Cloudflare Worker, Hono app, routes, D1 schema
shared/   # Zod schemas and shared TypeScript types
```

Key files:

```text
server/app.ts                 # Hono app composition
server/worker.ts              # Worker entrypoint
server/routes/skills.ts       # Skills API routes
server/db/schema.ts           # Drizzle D1 schema
shared/schemas/skills.ts      # Zod schemas shared by API and SPA
client/app.tsx                # SPA entry UI
wrangler.jsonc                # Cloudflare Worker, D1, R2, assets config
vite.config.ts                # Vite + Cloudflare plugin config
```

## Commands

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm build
pnpm deploy
```

Database commands:

```bash
pnpm db:generate
pnpm db:migrate:local
pnpm db:migrate:remote
```

Cloudflare resource setup:

```bash
wrangler d1 create skillpack
wrangler r2 bucket create skillpack-objects
```

After creating D1, update `wrangler.jsonc` with the production `database_id`.

## Architecture Notes

- Keep client and server code separated: `client/`, `server/`, and `shared/`.
- Use `tsconfig.client.json` and `tsconfig.server.json`; root `tsconfig.json` only contains project references.
- Add new Hono route groups under `server/routes/*` and mount them in `server/app.ts`.
- Use shared Zod schemas from `shared/schemas/*` for request/response validation and client parsing.
- Use Cloudflare bindings directly through `c.env`; avoid Cloudflare REST calls from inside the Worker.
- Store skill content in R2 and store metadata/manifests in D1.


## Frontend Architecture

Must read doc: `docs/frontend-structure.md` before adding or moving frontend files.

Frontend source lives in `client/`. It is built with Vite (`vite.config.ts`), uses React Router.

**Import convention**: prefer the `@/*` path alias (e.g., `@/domain/charts`) over relative paths for cross-layer imports. The alias is defined in `tsconfig.client.json`.

Before adding or moving frontend files, follow its `pages / features / domain / components / shared` structure.

Core frontend boundaries:

- `pages/` — thin route entries only.
- `features/` — user workflows, Zustand state, and feature-specific API hooks.
- `domain/` — pure business models, transformations, validation, and rules.
- `components/` — reusable business UI blocks.
- `components/ui` — reusable UI components, from shadcn UI.
- `shared/` — generic app infrastructure, components, hooks, and utilities.

State management rule: TanStack Query owns server state from APIs; Zustand owns client interaction state in `features/<feature>/store/`; React Context is only for cross-cutting platform plumbing. Do not duplicate API data into Zustand stores.

## Data Model Notes

- `skills.name` is indexed but storage-level duplicates are allowed.
- Business logic currently enforces unique skill names at API create time.
- Skill content is stored at `skills/{name}/{version}/SKILL.md` in R2.
- `skill_versions` keeps version metadata, object keys, and SHA-256 values.

## API

```text
GET  /api/health
GET  /api/v1/skills/catalog
GET  /api/v1/skills/:name
POST /api/v1/skills
```

Create a skill locally:

```bash
curl -X POST http://localhost:5173/api/v1/skills \
  -H 'content-type: application/json' \
  -d '{
    "name": "api-skill-demo",
    "description": "Demo API-backed skill",
    "version": "0.1.0",
    "content": "# Demo Skill\n\nUse this skill when validating API-backed skills."
  }'
```

## Gotchas

- `wrangler.jsonc` uses a production D1 `database_id`; local dev still uses Wrangler local state with the same `DB` binding.
- `components.json` points shadcn/ui to `client/styles.css` and `@/components` aliases.
- Build output is generated under `dist/` and should stay untracked.
- `.DS_Store` should stay ignored and untracked.
