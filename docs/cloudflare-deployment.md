# Cloudflare Deployment Guide

Skillpack deploys as one Cloudflare Worker service:

- Hono API routes under `/api/*`
- OAuth and metadata routes under `/.well-known/*`
- Vite React SPA assets for everything else
- D1 database binding named `DB`
- R2 bucket binding named `BUCKET`

The deployable package is `@skillpack/app` in `apps/skillpack`. Root scripts wrap
that package through pnpm and Turbo.

## Prerequisites

Install dependencies and confirm Wrangler can access the target Cloudflare
account:

```bash
pnpm install
pnpm --filter @skillpack/app exec wrangler whoami
```

Skillpack uses GitHub as the primary sign-in provider. Before production login
will work, register the deployed callback URL with the GitHub OAuth App:

```text
https://<your-domain>/api/auth/callback/github
```

If OIDC login is enabled, register its deployed callback too:

```text
https://<your-domain>/api/auth/oauth2/callback/oidc
```

## Create Cloudflare Resources

Create the D1 database and R2 bucket once per production Cloudflare account:

```bash
pnpm --filter @skillpack/app exec wrangler d1 create skillpack
pnpm --filter @skillpack/app exec wrangler r2 bucket create skillpack-objects
```

Copy the generated D1 `database_id` into
`apps/skillpack/wrangler.jsonc` under the `DB` binding:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "skillpack",
    "database_id": "<generated-d1-database-id>",
    "migrations_dir": "migrations",
  },
]
```

Keep the R2 bucket name aligned with the configured `BUCKET` binding:

```jsonc
"r2_buckets": [
  {
    "binding": "BUCKET",
    "bucket_name": "skillpack-objects",
  },
]
```

References:
[D1 Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/)
and [R2 bucket creation](https://developers.cloudflare.com/r2/buckets/create-buckets/).

## Configure Production Environment

Keep `apps/skillpack/wrangler.jsonc` limited to stable deployment structure:
Worker entrypoint, assets, D1, R2, compatibility settings, and optional domain
routes. Do not commit instance-specific auth provider values for an open source
deployment.

Set production auth values with Wrangler from `apps/skillpack`:

```bash
pnpm --filter @skillpack/app exec wrangler secret put BETTER_AUTH_SECRET
pnpm --filter @skillpack/app exec wrangler secret put GITHUB_CLIENT_ID
pnpm --filter @skillpack/app exec wrangler secret put GITHUB_CLIENT_SECRET
pnpm --filter @skillpack/app exec wrangler secret put OIDC_CLIENT_ID
pnpm --filter @skillpack/app exec wrangler secret put OIDC_DISCOVERY_URL
```

Set these values before testing deployed auth:

```text
BETTER_AUTH_SECRET   secret, required
GITHUB_CLIENT_ID     required for GitHub login
GITHUB_CLIENT_SECRET secret, required for GitHub login
OIDC_CLIENT_ID       optional
OIDC_DISCOVERY_URL   optional
```

`GITHUB_CLIENT_ID`, `OIDC_CLIENT_ID`, and `OIDC_DISCOVERY_URL` are not strictly
secrets, but they are instance-specific. Keeping them in Cloudflare instead of
tracked config lets this repository stay reusable for other deployers.

Do not commit secret values in `vars`. Cloudflare documents Worker secrets
separately from environment variables:
[Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

## Apply Remote Migrations

Apply D1 migrations to the remote database before deploying code that depends on
new schema:

```bash
pnpm db:migrate:remote
```

This runs the app script:

```bash
wrangler d1 migrations apply skillpack --remote
```

If a migration fails, stop and fix the migration before deploying the Worker.

## Validate And Deploy

Run the same checks from the repository root:

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

Deploy the Worker and static assets:

```bash
pnpm deploy
```

The app deploy script runs:

```bash
pnpm build && wrangler deploy
```

Wrangler deploy reference:
[Workers deploy command](https://developers.cloudflare.com/workers/wrangler/commands/workers/).

## Bind A Domain To The Worker

Use a Cloudflare Workers Custom Domain when Skillpack should own all paths for a
hostname, for example `skillpack.example.com`. Custom Domains are the simplest
fit for this app because the Worker is the origin for both the SPA and API.

Official guide:
[Workers Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

Dashboard path:

1. Open the Cloudflare dashboard.
2. Go to Workers & Pages.
3. Select the `skillpack` Worker.
4. Go to Settings > Domains & Routes.
5. Select Add > Custom Domain.
6. Enter the hostname and add it.

Requirements:

- The hostname must be in an active Cloudflare zone you control.
- The hostname cannot already have a conflicting CNAME record.
- After the domain is attached, update OAuth provider callback URLs to use that
  hostname.

To manage the custom domain from Wrangler instead, add a `routes` entry in
`apps/skillpack/wrangler.jsonc`:

```jsonc
"routes": [
  {
    "pattern": "skillpack.example.com",
    "custom_domain": true,
  },
]
```

Then redeploy:

```bash
pnpm deploy
```

If you only need to run the Worker on selected paths under a hostname that has
another origin, use Cloudflare Worker Routes instead of Custom Domains:
[Workers routes](https://developers.cloudflare.com/workers/configuration/routing/routes/).

## Post-Deploy Smoke Checks

Check the health endpoint:

```bash
curl https://<your-domain>/api/health
```

Check that the SPA responds:

```bash
curl -I https://<your-domain>/
```

Check live logs while testing login and API requests:

```bash
pnpm --filter @skillpack/app exec wrangler tail
```

Smoke the main browser flow:

1. Open `https://<your-domain>/`.
2. Sign in with GitHub.
3. Confirm the callback returns to the app.
4. Open the skills list.
5. Create or fork a test skill if production data writes are expected.

## Troubleshooting

- Auth provider missing: set both `GITHUB_CLIENT_ID` and
  `GITHUB_CLIENT_SECRET`; partial provider config is rejected.
- OIDC missing: set both `OIDC_CLIENT_ID` and `OIDC_DISCOVERY_URL`, or remove
  both to keep OIDC disabled.
- Login callback mismatch: update the GitHub OAuth App and OIDC provider with
  the exact deployed domain callback URLs.
- API returns the SPA: confirm `assets.run_worker_first` still includes
  `/api/*` and `/.well-known/*`.
- Remote schema missing: rerun `pnpm db:migrate:remote` against the same D1
  database configured in `wrangler.jsonc`.
- Domain will not attach: remove conflicting DNS records, or use Worker Routes
  if only selected paths should invoke Skillpack.
- Local auth values are not present in production: `.dev.vars` only applies to
  local development; use `wrangler secret put` for deployed Workers.
