# Skillpack

A single Cloudflare Worker serving both:

- Hono API under `/api/*`
- Vite React SPA through Cloudflare static assets

The stack uses Cloudflare Workers, D1, R2, Drizzle ORM, Hono, React, Vite, Tailwind CSS, shadcn-style UI components, TypeScript, Turborepo, pnpm, and Zod schemas.

## Project layout

```text
apps/skillpack/              # Cloudflare Worker + Vite React SPA deployment unit
  client/                    # Vite React SPA
  server/                    # Hono app, Worker entrypoint, D1 schema
  migrations/                # D1 migrations
packages/core/               # shared Skillpack primitives and Zod value schemas
packages/contracts/          # frontend/backend API request/response contracts
packages/typescript-config/  # shared TypeScript configs
```

## Development

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

## Auth Setup

Skillpack uses Better Auth. GitHub is the primary sign-in provider, and the
same GitHub OAuth App credentials are reused for authenticated public GitHub
Origin reads. A generic OIDC provider can be enabled as an optional fallback;
when OIDC vars are absent, the OIDC login button is hidden.

For local development:

```bash
cp apps/skillpack/.dev.vars.example apps/skillpack/.dev.vars
```

Set `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID`, and `GITHUB_CLIENT_SECRET` in
`.dev.vars`. Register this redirect URI with your GitHub OAuth App:

```text
http://localhost:5173/api/auth/callback/github
```

Optionally set `OIDC_CLIENT_ID` and `OIDC_DISCOVERY_URL` to enable fallback
OIDC login. Register this redirect URI with your OIDC provider:

```text
http://localhost:5173/api/auth/oauth2/callback/oidc
```

Use a GitHub OAuth App for `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`, not a
personal access token. Those same values also raise GitHub API rate limits for
public GitHub-origin discovery and fork reads.

For now, Skillpack trusts the configured browser sign-in providers for
same-email account linking while keeping Better Auth's email-verified checks.
This is a temporary v1 shortcut; a formal account linking flow should replace
it before adding more login providers.

For deployed environments, set secrets with Wrangler:

```bash
pnpm --filter @skillpack/app exec wrangler secret put BETTER_AUTH_SECRET
pnpm --filter @skillpack/app exec wrangler secret put GITHUB_CLIENT_ID
pnpm --filter @skillpack/app exec wrangler secret put GITHUB_CLIENT_SECRET
pnpm --filter @skillpack/app exec wrangler secret put OIDC_CLIENT_ID
pnpm --filter @skillpack/app exec wrangler secret put OIDC_DISCOVERY_URL
```

`GITHUB_CLIENT_ID`, `OIDC_CLIENT_ID`, and `OIDC_DISCOVERY_URL` are not strictly
secret, but they are deployment-instance values. Keeping them in Cloudflare
rather than tracked `wrangler.jsonc` keeps the open source config reusable.

Register the deployed GitHub redirect URI with the same callback path:

```text
https://<your-domain>/api/auth/callback/github
```

If OIDC is enabled, register the deployed OIDC redirect URI too:

```text
https://<your-domain>/api/auth/oauth2/callback/oidc
```

## Cloudflare setup

Create resources:

```bash
pnpm --filter @skillpack/app exec wrangler d1 create skillpack
pnpm --filter @skillpack/app exec wrangler r2 bucket create skillpack-objects
```

Update `apps/skillpack/wrangler.jsonc` with the generated D1 `database_id`.

Apply migrations:

```bash
pnpm db:migrate:local
pnpm db:migrate:remote
```

The current development migration resets Managed Skill tables to the Skill ID
model and drops old skill rows. Auth tables are not reset.

Seed local development data while `pnpm dev` is running. The skills API is protected, so pass a session cookie from a local browser login:

```bash
SKILLPACK_AUTH_COOKIE='better-auth.session_token=...' pnpm db:seed:local
```

Deploy:

```bash
pnpm deploy
```

## API

```text
GET  /api/health
GET  /api/v1/skills
GET  /api/v1/skills/:identifier
GET  /api/v1/skills/:identifier?version=
GET  /api/v1/skills/:skillId/versions
GET  /api/v1/skills/:skillId/resources?version=&path=
GET  /api/v1/skills/:skillId/resources/raw?version=&path=
POST /api/v1/skills
POST /api/v1/skills/fork
PATCH /api/v1/skills/:skillId
POST /api/v1/skills/:skillId/versions/:versionNumber/restore
DELETE /api/v1/skills/:skillId
```

Create a skill:

```bash
curl -X POST http://localhost:5173/api/v1/skills \
  -H 'content-type: application/json' \
  -d '{
    "name": "api-skill-demo",
    "description": "Demo API-backed skill",
    "versionLabel": "first draft",
    "content": "# Demo Skill\n\nUse this skill when validating API-backed skills.",
    "resources": [
      {
        "path": "references/demo.md",
        "mediaType": "text/markdown; charset=utf-8",
        "content": "# Demo Resource\n\nExtra context loaded on demand."
      },
      {
        "path": "scripts/demo.py",
        "mediaType": "text/x-python; charset=utf-8",
        "content": "print('hello from a skill resource')\n"
      }
    ]
  }'
```

Created Skillpack-managed skills can be resolved by Skill ID or Skill Name:

```text
/api/v1/skills/1
/api/v1/skills/demo
```
