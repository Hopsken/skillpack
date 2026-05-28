---
status: proposed
date: 2026-05-28
decision-makers: Sean
consulted: Current Skillpack codebase, ADR-0001, ADR-0002, GitHub REST API rate-limit guidance, GitHub Contents and Git database APIs
informed: Future Skillpack maintainers and coding agents
---

# ADR-0005: Use OAuth App Credentials for Public GitHub Origin Reads

Skillpack will authenticate public GitHub Origin reads with GitHub OAuth App
client credentials and read file content through GitHub REST APIs.

## Context

Skillpack's GitHub Origin Adapter discovers Skills in arbitrary public GitHub
repositories and reads selected definitions so users can Fork them into Managed
Skills. This is a public-repository workflow, not a private repository access
workflow.

The previous implementation optionally accepted `GITHUB_TOKEN`, which made
production rate-limit relief depend on a personal access token. That token
represented a human account and could carry unrelated permissions. The same
adapter also read file content from `raw.githubusercontent.com`, outside the
REST API request path used for repository, commit, and tree reads.

ADR-0001 keeps GitHub as Skill Origin provenance, never Managed Skill identity.
ADR-0002 keeps GitHub integration inside the `origins` module as an Origin
Adapter. This decision only changes how that adapter authenticates and reads
public GitHub content.

## Decision

Use GitHub OAuth App client credentials for authenticated public REST API
requests.

For v1:

- The Worker accepts `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
- Both values must be configured together. If neither is configured, public
  GitHub reads remain unauthenticated for local development and small installs.
- `GITHUB_CLIENT_SECRET` is a Cloudflare secret. `GITHUB_CLIENT_ID` is a
  non-secret environment variable.
- These credentials are also reused by Better Auth GitHub sign-in; the OAuth
  App callback must include `/api/auth/callback/github`.
- The GitHub transport sends Basic auth to `api.github.com` when both
  credentials are present.
- The adapter reads `SKILL.md` and resource files through GitHub REST blob
  endpoints using blob SHAs from the resolved tree.
- The adapter does not use `raw.githubusercontent.com` for definition/resource
  reads.
- No KV, Cache API, ETag cache, stale fallback, private repo support, or GitHub
  App installation flow is included in this slice.

## Consequences

- Public GitHub rate-limit relief no longer depends on a personal access token.
- GitHub sign-in and public Origin read rate-limit relief are coupled to one
  GitHub OAuth App for v1.
- Skillpack temporarily trusts configured browser sign-in providers for
  same-email account linking while keeping Better Auth's email-verified checks.
  A formal account-linking flow should replace this shortcut before more
  providers are added.
- All GitHub Origin reads use one REST API transport, making auth and error
  handling consistent.
- File content reads require tree blob SHAs, so the GitHub retrieval code must
  carry each selected Skill file's SHA along with its path.
- Rate-limit pressure may still appear at larger scale because this decision
  intentionally avoids caching. Add caching only when usage proves it is needed.
- Private repositories will need a separate GitHub App installation design.

## Alternatives Considered

### Keep `GITHUB_TOKEN`

Rejected because it encourages production to depend on a human-owned PAT and
does not express the product's public-repository-only requirement.

### Use GitHub App installation tokens

Rejected for arbitrary public repositories. Installation tokens are appropriate
when a user or organization installs the Skillpack GitHub App on selected
repositories, but arbitrary public repo owners will not have installed the app.
This remains the likely direction for private repo support.

### Cache GitHub responses now

Rejected for this slice. Cache API and KV were considered, including ETag-based
revalidation. The current scale does not justify adding cache state, body
retention, invalidation behavior, or stale-response semantics.

### Continue reading raw URLs

Rejected because raw file downloads do not share the same REST API transport,
authentication, and error surface as repository, commit, and tree reads.

## Implementation Plan

- Replace `GITHUB_TOKEN` plumbing with `GITHUB_CLIENT_ID` and
  `GITHUB_CLIENT_SECRET` in Worker env types and origin service construction.
- Update `createGitHubTransport` to send OAuth App Basic auth when configured
  and reject partial credential configuration.
- Replace raw URL file reads with REST blob reads in the GitHub Origin Adapter.
- Update `.dev.vars.example`, README setup instructions, and GitHub retrieval
  tests.

## Verification

- [ ] GitHub transport sends Basic auth when both OAuth App credentials are
      configured.
- [ ] GitHub transport omits Authorization when neither credential is
      configured.
- [ ] Partial GitHub credential configuration fails fast.
- [ ] Selected Skill definitions and resources are read through REST blobs.
- [ ] No origin adapter code calls `raw.githubusercontent.com`.
- [ ] `pnpm --filter @skillpack/app test` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm check` passes.
