---
status: proposed
date: 2026-05-25
decision-makers: Sean
consulted: Current Skillpack codebase, CONTEXT.md, backend architecture guidance, ADR-0001
informed: Future Skillpack maintainers and coding agents
---

# ADR-0002: Separate Skill Origin Adapters from Managed Skill Lifecycle

Skill Origin discovery and definition retrieval will live in a dedicated `origins` backend module. The `skills` module will keep ownership of Managed Skill persistence, current resources, Snapshots, Fork, and attached origin provenance on Skill state.

## Context

The current Fork implementation is GitHub-specific inside `server/modules/skills/service.ts`. It parses GitHub repository URLs, resolves branches and commits, walks Git trees, fetches raw files, creates Managed Skills, writes resources, and records provenance in one service method.

That coupling makes GitHub look like part of the generic Managed Skill lifecycle. Skillpack needs GitHub to be only one Skill Origin kind, with future support for npm and other origins. ADR-0001 also established that origins never form Managed Skill identity; they provide provenance and review targets.

The previous backend architecture guide suggested `server/modules/<module>/sources/<source>-source.ts` for external integrations. That placement is now too narrow because Skill Origin discovery has its own lifecycle and product surface.

## Decision

Create a dedicated `server/modules/origins` module for Skill Origin integration.

The `origins` module owns:

- Origin Adapter registry.
- Origin-specific input parsing and validation beyond shared API shape.
- Discovery of candidate Skills from a Skill Origin.
- Reading selected Skill definitions, including `SKILL.md` content and resources.
- Returning origin-neutral DTOs plus provenance metadata.

The `skills` module owns:

- Managed Skill creation, editing, Snapshot creation, Snapshot restore, deletion, and resolution.
- R2 resource storage for current Skill state and Snapshots.
- D1 rows for Managed Skills, current resources, Snapshots, and attached origin JSON.
- Fork as the workflow that creates or updates Managed Skills from resolved origin definitions.

Origin provenance remains owned by the `skills` module. Under ADR-0001's Skill-centric model, origin is nullable structured JSON on the Managed Skill state and is captured inside Snapshot state JSON.

## API Shape

Origin discovery and Fork are separate product steps:

```text
POST /api/v1/origins/discover
POST /api/v1/skills/fork
```

Discovery returns candidates from one Skill Origin. Fork receives the same origin plus a list of selected candidates.

Fork requests are origin-generic:

```ts
type ForkSkillRequest = {
  origin:
    | { kind: "github"; repoUrl: string; branch?: string }
    | { kind: "npm"; packageName: string; version?: string };
  selections: Array<{ skillName: string }>;
  snapshotLabel?: string;
};
```

Batch Fork uses partial success. One selected Skill failing to Fork does not prevent other selected Skills from becoming Managed Skills.

## Consequences

- `SkillService.forkSkill` should stop containing GitHub-specific parsing, fetch, tree walking, and raw file logic.
- GitHub logic should move into an Origin Adapter under `server/modules/origins/adapters`.
- GitHub discovery should use one resolved repository tree and then apply Skillpack's GitHub skill path policy rather than walking the GitHub Contents API directory-by-directory.
- GitHub discovery is intentionally cheap: it returns path-derived candidates and resolved origin metadata, but does not fetch every candidate `SKILL.md` for frontmatter descriptions.
- GitHub candidate discovery uses this priority order: root `SKILL.md`, `skills/`, `skills/.curated/`, `skills/.experimental/`, `skills/.system/`, `.agents/skills/`, `.claude/skills/`, `.codex/skills/`, then a capped recursive fallback only when priority roots find nothing.
- When path-derived candidate names duplicate, the first candidate in priority order wins. Managed Skill names can still duplicate because Fork reads the selected `SKILL.md` frontmatter and uses that name for the Managed Skill.
- GitHub Fork remains text-only for now. Unsupported resource file types fail the selected Fork result instead of creating an incomplete Managed Skill.
- `SkillService` may depend on the public `OriginService` because cross-module service dependencies are allowed.
- `originsRoute` should be registered separately from `skillsRoute` and protected by the same authentication boundary.
- Shared contracts need origin discovery request/response schemas and an origin-generic batch Fork schema.
- Fork responses need per-selection success or failure results.
- Origin JSON should eventually allow more than `"github"` once additional Origin Adapters ship.

## Alternatives Considered

### Keep adapters under `server/modules/skills/sources`

This keeps code physically close to Fork, but it treats external discovery as a helper detail of Managed Skills. That makes it harder to add a first-class discovery API and encourages future npm/GitHub logic to grow inside the skills module.

Rejected because Skill Origins have their own discovery and definition retrieval responsibilities.

### Keep GitHub-specific Fork contract

The existing request shape is simple:

```ts
type ForkSkillRequest = {
  repoUrl: string;
  branch?: string;
  skillName: string;
  snapshotLabel?: string;
};
```

This is acceptable for a GitHub-only prototype, but it bakes GitHub into the public Fork workflow and only supports one selected Skill per request.

Rejected because Fork should be origin-generic and support Batch Fork.

### Make Batch Fork all-or-nothing

All-or-nothing behavior sounds simpler to users, but Fork spans external network calls, R2 writes, and D1 writes. Skillpack does not have a clean global transaction across those systems.

Rejected because partial success is more honest and avoids fragile compensating cleanup logic.

## Non-goals

- Designing npm adapter details.
- Designing Origin Comparison storage or diff representation.
- Moving persisted origin provenance into the `origins` module.
- Supporting multiple origins in one Fork request.
- Guaranteeing transactional all-or-nothing Fork across D1, R2, and external origin reads.
