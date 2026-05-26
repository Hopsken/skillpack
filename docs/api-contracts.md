# API Contracts

This document defines the target API contracts for Skillpack as a Skills Management Platform.

## Principles

- API routes address Managed Skills by Skill ID.
- Skill Name is display and search metadata, and duplicate names are allowed.
- Skill description belongs to the resolved version snapshot.
- Version pins use system-generated version numbers.
- Skill Origin discovery is separate from Fork.
- Fork accepts one Skill Origin plus one or more selected Skills.
- Batch Fork uses partial success.
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

type SkillOrigin =
  | {
      kind: "github";
      repoUrl: string;
      branch?: string;
      rev?: string;
    }
  | {
      kind: "npm";
      packageName: string;
      version?: string;
    };

type OriginSelection = {
  skillName: string;
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

## Discover Origin Skills

```http
POST /api/v1/origins/discover
```

Request:

```ts
type DiscoverSkillsRequest = {
  origin: SkillOrigin;
};
```

Response:

```ts
type DiscoverSkillsResponse = {
  origin: SkillOrigin;
  resolvedOrigin:
    | {
        kind: "github";
        repoUrl: string;
        branch: string;
        rev: string;
      }
    | {
        kind: "npm";
        packageName: string;
        version: string;
      };
  candidates: Array<{
    selection: OriginSelection;
    name: string;
    description?: string;
    path?: string;
  }>;
};
```

Behavior:

- Reads one Skill Origin and returns candidate Skills that can be Forked.
- GitHub discovery resolves the requested branch, or the repository's default branch when `branch` is omitted.
- GitHub discovery scans well-known skill roots in order: `skills`, `.agents/skills`, `.claude/skills`, then `.codex/skills`.
- Does not create Managed Skills or origin provenance records.

## Read Skill Definitions From Origin

```http
POST /api/v1/origins/definitions
```

Request:

```ts
type ReadSkillDefinitionsRequest = {
  origin: SkillOrigin;
  selections: OriginSelection[];
};
```

Response:

```ts
type ReadSkillDefinitionsResponse = {
  results: Array<
    | {
        status: "resolved";
        definition: {
          selection: OriginSelection;
          name: string;
          description: string;
          content: string;
          resources: Array<{
            path: string;
            content: string;
            mediaType: string;
            size: number;
          }>;
        };
      }
    | {
        status: "failed";
        selection: OriginSelection;
        error: string;
      }
  >;
};
```

Behavior:

- Reads selected Skill definitions and resources from one Skill Origin.
- Returns `SKILL.md` as the first resource so clients can preview the complete candidate before Fork.
- Does not create Managed Skills or origin provenance records.
- GitHub callers may pass a resolved `rev` from discovery to preview the same content that will later be Forked.

## Fork From Origin

```http
POST /api/v1/skills/fork
```

Request:

```ts
type ForkSkillRequest = {
  origin: SkillOrigin;
  selections: OriginSelection[];
  versionLabel?: string;
};
```

Response:

```ts
type ForkSkillResponse = {
  results: Array<
    | {
        status: "forked";
        selection: OriginSelection;
        skill: SkillListItem;
      }
    | {
        status: "failed";
        selection: OriginSelection;
        error: string;
      }
  >;
};
```

Behavior:

- Reads selected Skill definitions from the provided Skill Origin.
- Creates one Managed Skill per successfully resolved selection.
- Creates version `1` for each successfully Forked Managed Skill.
- Stores origin provenance for each successfully Forked Managed Skill.
- Uses SHA-256-based R2 object deduplication for all forked files.
- Uses partial success: one failed selection does not prevent other selections from becoming Managed Skills.
- Returns per-selection success or failure results.

## Deferred APIs

These APIs are intentionally deferred from the current scope:

- Skill Location Resolution
- Origin Comparison
- Skill Set creation and delivery
