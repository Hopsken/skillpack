# Skillpack

A single Cloudflare Worker serving both:

- Hono API under `/api/*`
- Vite React SPA through Cloudflare static assets

The stack uses Cloudflare Workers, D1, R2, Drizzle ORM, Hono, React, Vite, Tailwind CSS, shadcn-style UI components, TypeScript, pnpm, and Zod schemas.

## Project layout

```text
client/   # Vite React SPA
server/   # Cloudflare Worker, Hono app, routes, D1 schema
shared/   # Zod schemas and shared TypeScript types
```

## Development

```bash
pnpm install
pnpm dev
```

## Cloudflare setup

Create resources:

```bash
wrangler d1 create skillpack
wrangler r2 bucket create skillpack-objects
```

Update `wrangler.jsonc` with the generated D1 `database_id`.

Apply migrations:

```bash
pnpm db:migrate:local
pnpm db:migrate:remote
```

Seed local development data while `pnpm dev` is running:

```bash
pnpm db:seed:local
```

Deploy:

```bash
pnpm deploy
```

## API

```text
GET  /api/health
GET  /api/v1/skills/catalog
GET  /api/v1/skills/:name
POST /api/v1/skills
```

Create a skill:

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
