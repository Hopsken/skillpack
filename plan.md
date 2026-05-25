# Skillpack Pivot Refactor Plan

## Refactor Goal

Refactor Skillpack from a source-qualified aggregator into a Skills Management Platform:

```text
GitHub Origin -> Forked/Authored Managed Skill -> Versioned Resource Snapshot -> Skill Set -> Delivery
```

Core behaviors:

- Users manage Skillpack-owned Managed Skills.
- All Skill operations use Skill ID.
- Skill Name is display and search metadata, and duplicate names are allowed.
- Skill description belongs to each version snapshot.
- Third-party content enters the system through Fork.
- GitHub provides provenance for forked skills.
- Versions are system-generated incrementing numbers.
- Each version is a complete logical resource snapshot.
- `SKILL.md` is stored as a version resource.
- R2 objects are physically deduplicated by SHA-256.

Out of current scope:

- Agent-facing Skill Location Resolution.
- Skill Set creation and delivery.
- Origin Comparison.

Authoritative contract docs:

- [Data Model](./docs/data-model.md)
- [API Contracts](./docs/api-contracts.md)

## Phase 1 — Managed Skill Identity

### Target behavior

Users see and operate on Skillpack-owned Managed Skills.

Behavior standards:

- Skill list displays `id`, `name`, resolved-version `description`, and `currentVersion`.
- Skill detail opens by `id`.
- Multiple skills may share the same `name`.
- API routes, frontend routes, resource reads, and version reads all use `id`.
- Active API/domain language uses Skill ID as identity.

### Acceptance examples

```http
GET /api/v1/skills
```

```json
{
  "skills": [
    {
      "id": 1,
      "name": "code-review",
      "description": "Review code changes",
      "currentVersion": 3
    },
    {
      "id": 2,
      "name": "code-review",
      "description": "Review frontend changes",
      "currentVersion": 1
    }
  ]
}
```

```http
GET /api/v1/skills/1
```

Returns the current version of Skill `1`.

## Phase 2 — System-Generated Versions

### Target behavior

Creating, patching, or restoring a Skill creates a new version snapshot.

Behavior standards:

- Creating a Skill generates version `1`.
- Patching a Skill generates version `N + 1`.
- Users may optionally provide a version label.
- The current version points to the latest created snapshot.
- Version pins use numbers.
- Restoring a historical version creates a new version.
- Description is stored on the version snapshot.

### Acceptance examples

```http
POST /api/v1/skills
```

```json
{
  "name": "code-review",
  "description": "Review code changes",
  "content": "# Code Review\n..."
}
```

Returns:

```json
{
  "id": 1,
  "name": "code-review",
  "description": "Review code changes",
  "currentVersion": 1
}
```

```http
PATCH /api/v1/skills/1
```

```json
{
  "description": "Review code and summarize risk",
  "content": "# Code Review\n...",
  "changeSummary": "Update review instructions"
}
```

Returns:

```json
{
  "id": 1,
  "description": "Review code and summarize risk",
  "currentVersion": 2
}
```

```http
GET /api/v1/skills/1?version=1
```

Returns version `1`.

```http
POST /api/v1/skills/1/versions/1/restore
```

If current version is `3`, returns:

```json
{
  "id": 1,
  "currentVersion": 4,
  "restoredFromVersion": 1
}
```

## Phase 3 — Complete Resource Snapshots and SHA-256 R2 Deduplication

### Target behavior

Each Skill Version is a complete logical snapshot containing `SKILL.md` and its resource manifest. Physical R2 objects are deduplicated by SHA-256.

Behavior standards:

- `SKILL.md` is the main content resource path.
- Reading current skill returns the current version's `SKILL.md` content and resource manifest.
- Reading a pinned version returns that version's `SKILL.md` content and resource manifest.
- Patching a skill carries forward unchanged resources from the current version.
- `upsertResources` replaces or adds specific resource paths.
- `deleteResourcePaths` removes specific resource paths from the new snapshot.
- Historical version resources remain readable.
- Resource rows store `path`, `sha256`, `mediaType`, and `size`.
- R2 object keys are derived from SHA-256, for example `objects/sha256/{sha256}`.
- Writing a resource reuses an existing R2 object when the SHA-256 already exists.

### Acceptance examples

```http
PATCH /api/v1/skills/1
```

```json
{
  "content": "# Code Review\nUpdated instructions",
  "upsertResources": [
    {
      "path": "scripts/check.ts",
      "content": "export const check = () => true;",
      "mediaType": "application/typescript"
    }
  ],
  "deleteResourcePaths": ["old-notes.md"]
}
```

Creates a new version whose manifest includes `SKILL.md`, upserts `scripts/check.ts`, carries forward unchanged resources, and excludes `old-notes.md`.

```http
GET /api/v1/skills/1/resources?version=2&path=SKILL.md
```

Reads the main content resource from Skill `1`, version `2`.

```http
GET /api/v1/skills/1/resources/raw?version=2&path=scripts/check.ts
```

Returns the raw resource body.

## Phase 4 — Fork as Skill Creation From GitHub

### Target behavior

Users can create a Managed Skill copy from GitHub. The product behavior is Fork.

Behavior standards:

- Fork reads skill content from a GitHub repository branch.
- When branch is omitted, the GitHub adapter resolves the repository's default branch.
- Fork request uses `repoUrl`, optional `branch`, and `skillName`.
- A repository may contain multiple skills.
- The GitHub adapter resolves the requested skill by Skill Name.
- Fork creates a new Managed Skill.
- Fork creates version `1`.
- Fork stores GitHub provenance in `skill_origins`.
- Origin has `kind: "github"`, repository `url`, and JSON `metadata`.
- Metadata records adapter-specific details such as branch, resolved revision, and resolved skill path.
- Forked Skill identity is Skill ID.
- Product and API language use `fork`.

### Acceptance examples

```http
POST /api/v1/skills/fork
```

```json
{
  "repoUrl": "https://github.com/example/agent-skills",
  "branch": "main",
  "skillName": "code-review"
}
```

Returns:

```json
{
  "id": 10,
  "name": "code-review",
  "description": "Review code changes",
  "currentVersion": 1,
  "origin": {
    "kind": "github",
    "url": "https://github.com/example/agent-skills",
    "metadata": {
      "branch": "main",
      "rev": "abc123",
      "resolvedSkillPath": "skills/code-review/SKILL.md"
    }
  }
}
```

## Phase 5 — Frontend Behavior Reset

### Target behavior

Frontend reflects the new Skillpack mental model.

Behavior standards:

- Library links use Skill ID.
- URL uses `/skills/{id}`.
- Skill Name is display text.
- Duplicate Skill Names navigate to distinct detail pages.
- Version tab displays version numbers and optional labels.
- Create creates version `1`.
- Edit uses PATCH and creates a new version.
- Resource editing sends partial changes through `content`, `upsertResources`, and `deleteResourcePaths`.
- GitHub Fork flow asks for repository URL, optional branch, and Skill Name.
- GitHub Fork flow emphasizes user review responsibility.

Suggested routes:

```text
/skills
/skills/:skillId
/skills/:skillId?version=2
/skills/:skillId/edit
/skills/:skillId/versions
/skills/fork
```

## Phase 6 — Terminology Cleanup

### Target behavior

Code, API, UI, and docs use consistent product language.

Use these terms:

- Managed Skill
- Skill ID
- Skill Origin
- Fork
- Managed Skill Version
- Skill Resource
- Skill Set
- Skill Delivery

Clean up these terms from active product/API/domain language:

- handle
- source type as identity
- import
- sync
- mirror
- GitHub locator
- required semver version
- Skill Location Resolution in current product scope

### Acceptance check

Search results should only show old terms in historical docs, avoid lists, third-party code, or explicitly named migration notes:

```bash
rg "handle|sourceType|source_type|import|sync|mirror|skill://github|skill://skillpack|resolvedLocation|location"
```

## Phase 7 — Deferred Design Handoffs

### Skill Set

Skill Set proceeds as a separate design task and should decide:

- Skill Set identity and naming
- Membership model
- Current-version vs pinned-version policy per item
- Agent/project/workflow/runtime targeting
- Delivery APIs and locator shape
- UI flows for composing and activating Skill Sets
- Sorting, grouping, enabled state, and disabled state

Current refactor ensures the Managed Skill model leaves room for Skill Set.

### Origin Comparison

Origin Comparison proceeds as a separate design task and should decide:

- Comparison request and response contract
- Branch and revision selection behavior
- Diff representation
- Review and accept UX
- Version creation behavior after accepting a comparison

Current refactor stores enough GitHub provenance for future comparison.

### Skill Location Resolution

Skill Location Resolution proceeds with future agent-facing delivery work and should decide:

- Locator shape
- Current-version resolution behavior
- Pinned-version resolution behavior
- Runtime delivery API
- Agent integration contract

Current refactor keeps Skill ID and numeric versions as the future resolution foundation.

## Recommended Execution Order

1. Contracts first: reset shared schemas around Skill ID, numeric versions, versioned description, resources, and GitHub origin metadata.
2. Backend identity: reshape database, repository, service, and route behavior around Skill ID.
3. Version behavior: implement create, patch, restore, current resolution, and pinned resolution.
4. Resource snapshot: store `SKILL.md` and resources as version resource rows with SHA-256 R2 deduplication.
5. Fork origin: add GitHub provenance and fork behavior with `repoUrl`, optional `branch`, and `skillName`.
6. Frontend route reset: update pages, API hooks, links, and version UI to use Skill ID.
7. Terminology cleanup: remove old model language from active code and docs.
8. Skill Set design: create a dedicated design artifact.
9. Origin Comparison design: create a dedicated design artifact.
10. Skill Location Resolution design: create a dedicated design artifact when agent-facing delivery enters scope.

## Minimal First Slice

The first stable slice should include Phase 1 through Phase 3:

- ID-based Managed Skill identity
- Numeric system versions
- Versioned description
- Complete logical resource snapshots
- `SKILL.md` as a version resource
- SHA-256-based R2 object deduplication

This establishes the new model's backbone before adding GitHub Fork, frontend polish, Skill Set, Origin Comparison, and Skill Location Resolution behavior.
