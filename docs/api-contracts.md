# API Contracts

This document defines the target API contracts for Skillpack as a Skills Management Platform.

## Principles

- API routes address Managed Skills by Skill ID.
- Skill Name is display and search metadata, and duplicate names are allowed.
- Skill description belongs to the resolved version snapshot.
- Version pins use system-generated version numbers.
- Fork from GitHub uses repository URL, branch, and Skill Name.
- Partial updates use PATCH and create a new version snapshot.

Base path:

```text
/api/v1
```

## Shared Types

```ts
type SkillOriginSummary = {
  kind: "github";
  url: string;
  metadata: Record<string, unknown> | null;
};

type ResourceManifestItem = {
  path: string;
  mediaType: string;
  sha256: string;
  size: number;
};

type CreateSkillResource = {
  path: string;
  content: string;
  mediaType?: string;
};
```

## Skill List

```http
GET /api/v1/skills
```

Response:

```ts
type SkillListResponse = {
  skills: SkillListItem[];
};

type SkillListItem = {
  id: number;
  name: string;
  description: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  origin?: SkillOriginSummary;
};
```

Example:

```json
{
  "skills": [
    {
      "id": 1,
      "name": "code-review",
      "description": "Review code changes",
      "currentVersion": 3,
      "createdAt": "2026-05-25T00:00:00.000Z",
      "updatedAt": "2026-05-25T00:00:00.000Z",
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
  ]
}
```

## Create Authored Skill

```http
POST /api/v1/skills
```

Request:

```ts
type CreateSkillRequest = {
  name: string;
  description: string;
  content: string;
  resources?: CreateSkillResource[];
  versionLabel?: string;
  changeSummary?: string;
};
```

Response:

```ts
type SkillCreatedResponse = SkillListItem;
```

Behavior:

- Creates a Managed Skill.
- Creates version `1` with the provided description and content.
- Stores `content` as the `SKILL.md` resource.
- Sets current version to `1`.
- Does not create an origin record.

## Read Skill

```http
GET /api/v1/skills/{skillId}
GET /api/v1/skills/{skillId}?version={versionNumber}
```

Response:

```ts
type ResolvedSkill = {
  id: number;
  name: string;
  description: string;
  version: number;
  versionLabel: string | null;
  content: string;
  resources: ResourceManifestItem[];
  origin?: SkillOriginSummary;
  createdAt: string;
  updatedAt: string;
};
```

Behavior:

- Missing `version` resolves the current version.
- Numeric `version` resolves a pinned version.
- `description` comes from the resolved version.
- `content` comes from the resolved version's `SKILL.md` resource.
- `resources` includes non-`SKILL.md` resources.

## Patch Skill

```http
PATCH /api/v1/skills/{skillId}
```

Request:

```ts
type PatchSkillRequest = {
  name?: string;
  description?: string;
  content?: string;
  upsertResources?: CreateSkillResource[];
  deleteResourcePaths?: string[];
  versionLabel?: string;
  changeSummary?: string;
};
```

Response:

```ts
type SkillPatchedResponse = {
  id: number;
  name: string;
  description: string;
  currentVersion: number;
};
```

Behavior:

- Creates version `N + 1`.
- Sets current version to the new version.
- Updates Skill Name when `name` is present.
- Stores description on the new version snapshot when `description` is present.
- Stores content as the `SKILL.md` resource when `content` is present.
- Carries forward unchanged resources from the current version.
- Upserts only the resources listed in `upsertResources`.
- Removes resources listed in `deleteResourcePaths`.
- Uses SHA-256-based R2 object deduplication for all resource writes.

## Delete Skill

```http
DELETE /api/v1/skills/{skillId}
```

Response:

```http
204 No Content
```

Behavior:

- Deletes skill metadata.
- Deletes version metadata.
- Deletes resource metadata.
- Deletes origin metadata when present.
- Keeps deduplicated physical R2 objects that may still be referenced by other resources.

## List Versions

```http
GET /api/v1/skills/{skillId}/versions
```

Response:

```ts
type SkillVersionListResponse = {
  id: number;
  name: string;
  currentVersion: number;
  versions: SkillVersionItem[];
};

type SkillVersionItem = {
  version: number;
  description: string;
  label: string | null;
  changeSummary: string | null;
  createdAt: string;
};
```

## Restore Version

```http
POST /api/v1/skills/{skillId}/versions/{versionNumber}/restore
```

Request:

```ts
type RestoreVersionRequest = {
  versionLabel?: string;
  changeSummary?: string;
};
```

Response:

```ts
type RestoreVersionResponse = {
  id: number;
  restoredFromVersion: number;
  currentVersion: number;
};
```

Behavior:

- Copies historical version resource rows and description.
- Creates version `N + 1`.
- Sets current to the new version.
- Reuses SHA-256 references to deduplicated R2 objects.

## Read Resource

```http
GET /api/v1/skills/{skillId}/resources?path={path}
GET /api/v1/skills/{skillId}/resources?version={versionNumber}&path={path}
```

Response:

```ts
type SkillResourceResponse = {
  path: string;
  mediaType: string;
  sha256: string;
  size: number;
  version: number;
  content: string;
};
```

Behavior:

- `path=SKILL.md` reads the main content resource.
- Other paths read attached resources.

## Read Raw Resource

```http
GET /api/v1/skills/{skillId}/resources/raw?path={path}
GET /api/v1/skills/{skillId}/resources/raw?version={versionNumber}&path={path}
```

Response headers:

```text
content-type: {mediaType}
content-length: {size}
x-skill-resource-sha256: {sha256}
x-skill-version: {versionNumber}
```

Response body is the raw resource bytes.

## Fork From GitHub

```http
POST /api/v1/skills/fork
```

Request:

```ts
type ForkSkillRequest = {
  repoUrl: string;
  branch?: string;
  skillName: string;
  versionLabel?: string;
};
```

Response:

```ts
type ForkSkillResponse = SkillListItem;
```

Behavior:

- Reads the requested GitHub branch, or resolves the repository's default branch when `branch` is omitted.
- Resolves the requested skill by `skillName` through the GitHub adapter.
- Records the actual branch used for the fork.
- Records the resolved Git revision as `rev`.
- Creates a Managed Skill using the resolved skill name, description, content, and resources.
- Creates version `1`.
- Stores origin provenance with `kind`, repository URL, and metadata containing branch, revision, and resolved skill path.
- Uses SHA-256-based R2 object deduplication for all forked files.
- Returns the created Managed Skill.

## Deferred APIs

These APIs are intentionally deferred from the current scope:

- Skill Location Resolution
- Origin Comparison
- Skill Set creation and delivery
