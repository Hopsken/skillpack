# Plan: North Star Refactor

## Solution Approach

Refactor the current MVP implementation into the ADR-0001 model while keeping the first implementation source limited to `skillpack`. Replace the old local-only schema with a clean north-star schema, reshape shared API contracts around Resolved Skill responses, and update the existing frontend flows to use source-qualified skills without changing the overall UI layout.

Core pipeline:

```text
Skill Source -> Skill -> Skill Trust -> Skill Delivery
```

## Ordered Steps

### 1. Rebuild the database schema and migrations

Affected files:

- `server/db/schema.ts`
- `migrations/*.sql`

Work:

- Rebuild the existing `skills`, `skill_versions`, and `skill_resources` tables around the north-star fields.
- Keep Better Auth tables in the initial migration set.
- Define supported source types in code rather than a `skill_sources` table for this slice.
- Model at least:
  - `skills`
  - `skill_versions`
  - `skill_resources`
  - trust/current approved fields either directly on `skills` or through a small trust table.
- Represent the built-in `skillpack` source through source-type constants and service logic.
- Store `source_type`, `handle`, `location`, `current_approved_version_id`, version string, object key, SHA-256, resource metadata, and timestamps.
- Keep schema extensible for future provider-specific source metadata tables when `github` and `npm` are implemented.

Verification:

- Drizzle types compile.
- Migration SQL creates all auth and north-star tables from scratch.
- Unique constraints enforce Skillpack-managed handle/name uniqueness.

### 2. Update shared schemas to north-star contracts

Affected files:

- `shared/schemas/skills.ts`

Work:

- Define source and trust schemas:
  - `skillSourceTypeSchema`
  - `skillSourceSchema`
  - `skillLocationSchema`
  - `skillTrustSchema`
- Replace catalog/read response concepts with:
  - `skillListItemSchema`
  - `skillListResponseSchema`
  - `resolvedSkillSchema`
  - `resourceManifestItemSchema`
  - `skillResourceResponseSchema`
  - `skillVersionListResponseSchema`
- Ensure Resolved Skill responses include:
  - `location`
  - `resolvedLocation`
  - `name`
  - `handle`
  - `description`
  - `source`
  - `version`
  - `trust`
  - `content`
  - `resources`

Verification:

- TypeScript consumers compile against the updated shared contracts.
- Existing `content` field remains the `SKILL.md` body field.

### 3. Add Skill Location parsing and construction

Affected files:

- `server/lib/http.ts` or a new `server/modules/skills/location.ts`
- `server/modules/skills/types.ts`
- `shared/schemas/skills.ts` if parser shape is shared

Work:

- Build canonical Skillpack-managed locations as `skill://skillpack/{handle}`.
- Parse source-qualified API paths into source type and locator.
- Support only `skillpack` as an implemented source type in service flows.
- Reject unsupported source types with a module error that maps to a clear HTTP status.
- Keep future source-owned URI shapes possible.

Verification:

- Parser accepts `skillpack/code-review` and builds `skill://skillpack/code-review`.
- Parser rejects unsupported or unsafe locators.

### 4. Refactor the skills backend module

Affected files:

- `server/modules/skills/route.ts`
- `server/modules/skills/service.ts`
- `server/modules/skills/repository.ts`
- `server/modules/skills/storage.ts`
- `server/modules/skills/presenter.ts`
- `server/modules/skills/errors.ts`
- `server/modules/skills/types.ts`

Work:

- Keep the module path as `server/modules/skills`.
- Replace name-based service functions with source-qualified Skill operations:
  - `listSkills()`
  - `createSkillpackSkill()`
  - `resolveSkill()`
  - `readSkillResource()`
  - `deleteSkill()`
  - `listSkillVersions()`
- Make `POST /api/v1/skills` create a Skillpack-managed Skill.
- Auto-approve new Skillpack-managed versions and set current approved.
- Make bare reads resolve current approved.
- Make `?version=` resolve a specific Skillpack-managed version.
- Store R2 objects under a source-qualified key such as `skills/skillpack/{handle}/{version}/SKILL.md`.

Verification:

- Creating a skill returns `skill://skillpack/{handle}`.
- Listing skills returns Skill list items.
- Bare read returns the current approved Resolved Skill.
- Version read returns the requested version.
- Resource manifest and resource content reads work.

### 5. Replace route shapes with source-qualified skills API

Affected files:

- `server/modules/skills/route.ts`
- `server/routes/index.ts` if route mounting needs adjustment
- `server/app.ts` auth middleware paths if needed

Work:

Implement:

```text
GET    /api/v1/skills
POST   /api/v1/skills
GET    /api/v1/skills/:sourceType/*locator
DELETE /api/v1/skills/:sourceType/*locator
GET    /api/v1/skills/:sourceType/*locator/resources?path=...
GET    /api/v1/skills/:sourceType/*locator/resources/raw?path=...
```

- Use Hono route patterns that safely capture locator tails.
- Keep resource path in query parameters.
- Map module errors to API errors consistently.

Verification:

- `GET /api/v1/skills` works for library listing.
- `GET /api/v1/skills/skillpack/code-review` resolves current approved.
- `GET /api/v1/skills/skillpack/code-review?version=0.1.0` resolves the requested version.
- Resource JSON and raw endpoints work with `path=...`.

### 6. Update frontend API hooks and routing

Affected files:

- `client/app.tsx`
- `client/pages/latest-skill-page.tsx`
- `client/pages/skill-detail-page.tsx`
- `client/features/skills/api/queries.ts`
- `client/features/skills/api/use-skill-detail.ts`
- `client/features/skills/api/use-skill-catalog.ts`
- `client/features/skills/components/skill-row.tsx`
- `client/features/skills/views/skill-detail-view.tsx`

Work:

- Change detail route to `/skills/skillpack/:handle`.
- Use query `?version=` for version selection rather than `/v/:version`.
- Fetch the library from `GET /api/v1/skills`.
- Fetch detail from `GET /api/v1/skills/skillpack/{handle}` plus optional `version` query.
- Fetch resource content from the new resource endpoints.
- Keep the current library/detail/resource viewer structure.
- Show useful metadata with minimal UI changes:
  - location
  - source type
  - trust status
  - current resolved version

Verification:

- Library rows navigate to `/skills/skillpack/{handle}`.
- Version links update `?version=` and keep the Versions tab behavior.
- Resource viewer still loads text and raw resources.

### 7. Update local seed script and documentation touchpoints

Affected files:

- `scripts/seed-local.mjs`
- `README.md` if API examples exist
- `docs/backend-architecture.md` only if new conventions need clarification

Work:

- Update seed delete and create URLs to source-qualified API paths.
- Update examples to use `GET /api/v1/skills` and `skill://skillpack/{handle}`.
- Keep ADR-0001 as the conceptual source of truth.

Verification:

- Local seed script targets the new API shape.

### 8. Run validation and fix issues

Commands:

```bash
pnpm check
pnpm typecheck
pnpm build
```

Expected result:

- Formatting/lint checks pass.
- TypeScript project references pass.
- Vite/Worker build succeeds. Existing large chunk warnings can remain if they are unrelated to this refactor.

## Risks and Open Questions

- Hono wildcard route syntax needs careful implementation for `:sourceType/*locator` plus `/resources` subroutes.
- Rebuilding migrations from scratch is acceptable for this local project state, and any remote D1 state would require a separate migration strategy.
- The exact trust table shape can be minimal for MVP because policy and review workflows are deferred.
- Future GitHub support may require additional indexes and source-specific locator parsing, so source/provenance fields should stay explicit.
- Frontend version navigation needs a small route/query cleanup to avoid carrying forward old `/v/:version` assumptions.
