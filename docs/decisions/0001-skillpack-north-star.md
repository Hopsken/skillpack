---
status: proposed
date: 2026-05-25
decision-makers: Sean
consulted: Current Skillpack codebase, CONTEXT.md, backend architecture guidance, agent skills reference
informed: Future Skillpack maintainers and coding agents
---

# ADR-0001: Define Skillpack as a Skills Management Platform

Skillpack is a Skills Management Platform for agents. It manages user-owned skills as platform-owned copies, organizes them into user-curated skill collections, and delivers resolved skill content to agent runtimes through Skillpack-mediated interfaces.

## Context

The previous north star described Skillpack as a skill aggregator and delivery layer. That model treated GitHub, npm, Skillpack-authored content, and future registries as source namespaces that normalized into a common skill model. It also made source-qualified `skill://` locators part of the agent-facing identity model, such as `skill://github/{owner}/{repo}/{skillName}`.

That direction conflicts with the product stance Skillpack now needs:

- Users should be responsible for the skills they make available to agents.
- Third-party skills should become user-owned managed copies inside Skillpack.
- GitHub and other external systems should provide provenance and comparison targets, not primary skill identity.
- Agent-facing locators should use stable user-scoped Skill Names, not upstream URLs, source-qualified handles, or internal storage IDs.
- A user's intended output is a managed collection of skills for an agent, project, workflow, or runtime context.
- A user should only see and manage the skills in their own Library.
- Skill names should be stable within a user's Library so Add to Library can update an existing Managed Skill when the same source name appears again.

The earlier code reflected the older model in several places:

- `server/db/schema.ts` stored `skills.source_type`, `skills.handle`, `skills.location`, `skills.current_approved_version`, and string versions.
- the old shared skill contract exposed `source`, `handle`, and string `version` fields.
- `server/modules/skills/location.ts` parsed source-qualified requests and built `skill://skillpack/{handle}` locators.
- `server/modules/skills/route.ts` served `/api/v1/skills/:sourceType/:locator`.
- `server/modules/skills/storage.ts` stored objects under `skills/skillpack/{handle}/{version}/...`.
- `client/` routes and API hooks navigated by `source.type` and `handle`.

This ADR replaces the aggregator/source-qualified model with a managed-copy model.

## Decision

Skillpack's high-level system model is:

```text
Skill Origin -> Forked or Authored Managed Skill -> Skill Trust -> Skill Set -> Skill Delivery
```

This model is the north star for future architecture and product decisions.

## Core Concepts

### Managed Skill

A Managed Skill is the primary product object. It is a platform-owned skill record in Skillpack that users can understand and agents can consume.

Forked, user-authored, agent-created, and API-created skills all become Managed Skills once Skillpack stores and owns their content lifecycle for one user.

### Skill ID

A Skill ID is the Skillpack-owned internal opaque storage identity for a Managed Skill.

Skill IDs may be pre-generated to support storage workflows and D1 batch writes, but they are not user-facing or agent-facing operation identifiers. Public APIs, user interfaces, and Skill Locations address Managed Skills by Skill Name within an authorized user context.

### Skill Origin

A Skill Origin is provenance metadata for a Managed Skill Version, such as GitHub, npm, another registry, user authoring, agent creation, or API creation.

Origins never form the skill's primary identity. Fields such as `github`, repository URL, source path, or creation mode belong to origin/provenance records, not to the identity of the Managed Skill. Provenance is attached to versions so an Add to Library update does not rewrite the source story for earlier versions.

### Fork

Fork is the product workflow for bringing third-party content into Skillpack.

Fork creates or updates a Managed Skill copy from a Skill Origin or another Managed Skill. Skillpack does not model this as import, sync, mirror, or upstream tracking. The product stance is that users should review, curate, and maintain the skills they use with agents.

In user-facing UI, Fork is presented as Add to Library. If the selected source Skill Name is new in the user's Library, Add to Library creates a Managed Skill. If that Skill Name already exists in the user's Library, Add to Library updates the existing Managed Skill by committing a new Managed Skill Version.

### Origin Comparison

Origin Comparison is a lightweight review workflow that compares a Managed Skill with current content available from its Skill Origin.

For the current design horizon, GitHub-origin comparisons use the repository's default branch and produce a simple diff for user review. Skillpack does not need to model complex refs, branch tracking, merge semantics, or version-control history at this stage.

Accepting an Origin Comparison creates a new Managed Skill Version.

### Managed Skill Version

A Managed Skill Version is a Skillpack-owned complete content snapshot for a Managed Skill.

Versions use system-generated incrementing numbers. Users may optionally label important versions, similar to named versions in Google Docs. Users are not required to provide semver values.

A new version is created by durable actions such as:

- Creating a skill
- Saving edits
- Restoring a previous version
- Accepting an Origin Comparison

Every Managed Skill Version is a complete resource snapshot containing `SKILL.md` plus its resource manifest. Cross-version incremental patching is out of scope; R2 object storage remains content-addressed by SHA-256.

Restoring a previous version creates a new version from the historical content. The timeline remains linear, and the current version is the highest committed `version_number`.

Managed Skill Versions do not own Skill Name. The owning Managed Skill's immutable name is mirrored into generated and resolved `SKILL.md` frontmatter.

### Skill Location

A Skill Location is an agent-facing private locator derived from Skill Name within an authorized user context:

```text
skill://skillpack/{skillName}
skill://skillpack/{skillName}?version={versionNumber}
```

Bare Skill Locations resolve to the latest committed version. A `version` query parameter pins resolution to a specific Managed Skill Version number.

Skill Locations are not fetchable content URLs. Agents and harnesses resolve them through Skillpack APIs, MCP tools, extension tools, or future delivery interfaces in an authorized user context. The same Skill Name may exist in different users' Libraries; authorization determines which Managed Skill is resolved.

### Skill Trust

Skill Trust is curation and safety metadata maintained for a Managed Skill, including provenance, review signals, and risk metadata. A separate approved/published pointer can be added later if the product introduces review gates.

User review is a product workflow that guides responsible skill use. The backend does not need a draft/approval state machine for the current pivot.

### Skill Set

A Skill Set is a user-curated collection of that user's Managed Skills intended for an agent, project, workflow, or runtime context.

Skill Sets express the complete skills collection a user wants to make available for a given use. Skill Set design deserves its own follow-up design pass and is deferred from this ADR's implementation scope.

### Skill Delivery

Skill Delivery is the agent-facing act of making Managed Skills available to an agent runtime through Skillpack-mediated resolution interfaces.

Delivery may resolve individual Managed Skills now and Skill Sets later.

## Alternatives Considered

### Keep aggregator and source-qualified Skill Locations

This was the previous north star. It preserved upstream source identity in agent-facing locators, for example `skill://github/{owner}/{repo}/{skillName}`.

This approach was rejected because it implies that agent consumption can be tied to upstream identity. It also makes GitHub repo changes, branch movement, source namespace conflicts, and source-specific revision semantics part of the agent-facing model.

### Model GitHub as import/sync

This approach would preserve a relationship where Skillpack follows an upstream repository and can update local entries from that source.

This approach was rejected because Skillpack is opinionated about user responsibility. Third-party content can help discovery and comparison, while the user's Managed Skill remains the object delivered to agents.

### Use internal Skill IDs as public identity

This approach would make internal Skill IDs part of API paths and Skill Locations.

This approach was rejected because public numeric or opaque IDs are harder for users and agents to reason about than Skill Names, and numeric IDs are especially vulnerable to model hallucination and enumeration concerns in a multi-user system. Skill IDs remain useful as internal storage identities, while `(user, Skill Name)` uniqueness provides the public operation identity.

### Allow duplicate names inside one user's Library

This approach would keep Skill Name as weak display metadata.

This approach was rejected because Add to Library needs a predictable target when the same source Skill Name is added again. Within one user Library, duplicate names make source updates, user selection, and future Skill Set composition ambiguous.

### Attach provenance to the Managed Skill

This approach would keep a single origin row for each Managed Skill.

This approach was rejected because Add to Library may update an existing Managed Skill from a new source snapshot. Storing one skill-level origin would make older versions appear to have the latest provenance.

### Require user-authored semantic versions

This approach would make users provide semver-style versions such as `0.1.0`.

This approach was rejected because Skillpack versions are managed content snapshots. System-generated version numbers match the product model and keep authoring lightweight.

## Consequences

- `skills.source_type` must be removed from Managed Skill identity.
- `skills.handle` must be removed. Skill Name is immutable, user-scoped public operation identity.
- `skills.owner_user_id` and `skills.name` must enforce `(owner_user_id, name)` uniqueness.
- `skill_versions.name` must be removed because versions do not own Skill Name.
- `skills.location` is redundant because it is derived from Skill Name. It may be removed or generated by presenters.
- GitHub and other external systems move into version-level origin/provenance metadata.
- Agent-facing locators use only `skill://skillpack/{skillName}` and optional `version` pins, resolved only in an authorized user context.
- Public API routes should address skills by Skill Name, for example `/api/v1/skills/{skillName}`. Public API responses should not expose Skill ID.
- API routes must scope Managed Skill reads and writes to the authenticated user. Cross-user access returns not found.
- Versions should use system-generated incrementing numbers and optional labels.
- Each version is a complete resource snapshot.
- Restore creates a new version copied from historical content without changing Skill Name.
- User-facing source actions should say Add to Library even when internal APIs and domain code still use Fork.
- Origin Comparison is a diff-oriented review aid, not sync, merge, or upstream tracking.
- Skill Set becomes a core product concept and needs a separate design pass.

## Non-goals

This ADR does not design:

- Skill Set schema, APIs, delivery policy, or UX
- Workspace, team, organization, and shared-library ownership
- Full GitHub indexing, authentication, rate-limit handling, or repository traversal
- Complex Git refs, branch tracking, merge semantics, or upstream history modeling
- npm source support
- Replacing content-addressed R2 storage with per-skill object paths
- Export/package/filesystem installation modes
- A backend draft/approval state machine for user review

## Implementation Plan

### 1. Update shared API contracts

Affected files:

- `shared/contract/skills/*`

Implemented changes:

- Replace `handle` fields and public `id` fields with Skill Name as the operation identity.
- Remove `source` from primary skill responses or move provenance into a future origin response shape.
- Change `version` from string schema to integer version number.
- Add optional version labels where needed.
- Keep `location` as a response field only if generated from Skill Name, or remove it from stored input contracts.
- Update create/update inputs so users do not provide version numbers.

Verification:

- Shared schemas expose Skill Name as public operation identity and do not expose Skill ID.
- Shared schemas validate Skill Name shape; ownership-scoped uniqueness is enforced server-side.
- Shared schemas do not expose `sourceType` or `handle` as skill identity.

### 2. Migrate the database model

Affected files:

- `server/db/schema.ts`
- `migrations/*`
- `server/modules/skills/repository.ts`

Required changes:

- Remove `skills.source_type`.
- Remove `skills.handle`.
- Remove or stop persisting `skills.location`.
- Remove `current_approved_version`; derive the current version from the highest committed `skill_versions.version_number`.
- Change `skill_versions.version` from text to numeric `version_number`.
- Add optional `skill_versions.label`.
- Add origin/provenance storage separately, for example `skill_origins`, when implementing fork-from-GitHub.
- Preserve `skill_resources.skill_version_id` as the resource snapshot boundary.

Verification:

- Managed Skills can have duplicate names across users but not within one user's Library.
- Managed Skills are queryable internally by Skill ID and publicly by Skill Name within owner scope.
- Version uniqueness is enforced by `(skill_id, version_number)`.
- Resource uniqueness remains scoped to `(skill_version_id, path)`.

### 3. Update Skill Location parsing and generation

Affected files:

- `server/modules/skills/location.ts`
- `server/modules/skills/types.ts`
- `server/modules/skills/presenter.ts`

Required changes:

- Generate Skill Location as `skill://skillpack/{skillName}`.
- Generate resolved locations as `skill://skillpack/{skillName}?version={versionNumber}`.
- Parse location input by Skill Name only in an authorized user context.
- Remove source-qualified parsing and unsupported source branches from managed-skill resolution.

Verification:

- `skill://skillpack/demo-skill` resolves Skill Name `demo-skill` in the authorized user's Library.
- `skill://skillpack/demo-skill?version=2` resolves version number `2` for Skill Name `demo-skill`.
- `skill://github/...` is not part of agent-facing managed skill resolution.

### 4. Update backend routes and services

Affected files:

- `server/modules/skills/route.ts`
- `server/modules/skills/service.ts`
- `server/modules/skills/repository.ts`
- `server/modules/skills/storage.ts`
- `server/modules/skills/errors.ts`

Required changes:

- Replace `/:sourceType/:locator` with Skill Name routes.
- Public routes resolve, list versions, read resources, and delete by Skill Name.
- On create, generate version number `1`.
- On save/update, create version number `N + 1` and set it as current.
- On restore, create version number `N + 1` from the selected historical snapshot and set it as current.
- Store resource content in content-addressed R2 objects, with D1 recording the ownership, version, resource path, and SHA-256 relationship:

```text
objects/sha256/{sha256}
```

Verification:

- `GET /api/v1/skills/{skillName}` returns the current version.
- `GET /api/v1/skills/{skillName}?version={versionNumber}` returns the pinned version.
- `GET /api/v1/skills/{skillName}/versions` lists numeric versions.
- Resource reads use Skill Name and version number in public APIs, then resolve to internal Skill ID before D1/R2 access.

### 5. Update frontend routing and skill feature usage

Affected files:

- `client/app.tsx`
- `client/pages/latest-skill-page.tsx`
- `client/features/skills/api/queries.ts`
- `client/features/skills/api/use-skill-detail.ts`
- `client/features/skills/components/skill-row.tsx`
- `client/features/skills/views/skill-detail-view.tsx`

Required changes:

- Navigate by Skill Name rather than source type, handle, or Skill ID.
- Treat `name` as the public operation identity and display text.
- Display version numbers and optional labels.
- Generate resource and version links using Skill Name.
- Keep review UX concerns in frontend flows; do not require backend draft approval for this pivot.

Verification:

- Skill list links route to `/skills/{skillName}`.
- Detail pages load by Skill Name.
- Duplicate Skill Names remain valid across different users because resolution is scoped to the authenticated user.

### 6. Design Skill Set separately

Create a follow-up design artifact for Skill Set.

The follow-up should decide:

- Skill Set identity and naming
- Membership model
- Current-version vs pinned-version policy per item
- Agent/project/workflow/runtime targeting
- Delivery APIs and locator shape
- UI flows for composing and activating Skill Sets

Verification:

- A separate Skill Set plan or ADR exists before implementing Skill Set persistence or delivery behavior.

## Verification Checklist

- [ ] `CONTEXT.md` uses Managed Skill, Skill Origin, Fork, Origin Comparison, Skill ID, Managed Skill Version, Skill Set, and Skill Delivery consistently.
- [ ] No primary skill API depends on `source_type` or `handle`.
- [ ] Skill Location generation uses `skill://skillpack/{skillName}`.
- [ ] Skill Location version pins use numeric version numbers.
- [ ] Create/save/restore workflows generate system version numbers.
- [ ] Managed Skill names can duplicate across users but not within one user's Library.
- [ ] Resource storage and resource manifests are scoped to a complete Managed Skill Version snapshot.
- [ ] GitHub-origin functionality is modeled as fork/provenance/comparison rather than sync/import/mirror.
- [ ] Skill Set implementation waits for a separate design pass.
- [ ] `pnpm typecheck` passes after implementation.
- [ ] `pnpm build` passes after implementation.

## Follow-up Actions

- Redesign and implement the Managed Skill database migration.
- Redesign shared schemas and API routes around Skill Name as public operation identity and Skill ID as internal storage identity.
- Update frontend routes and API hooks to use Skill Name.
- Add fork/provenance modeling for GitHub-origin skills.
- Add simple Origin Comparison against the GitHub repository default branch.
- Create a separate Skill Set design.
- Keep R2 storage content-addressed by SHA-256 unless a future ADR chooses per-skill object paths.
