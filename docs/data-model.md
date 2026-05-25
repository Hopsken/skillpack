# Data Model

This document defines the target data model for Skillpack as a Skills Management Platform.

## Principles

- Managed Skill identity is Skill ID.
- Skill Name is display and search metadata, and duplicate names are allowed.
- Skill Origin is GitHub provenance metadata for forked skills.
- Fork creates a Skillpack-owned Managed Skill copy.
- Versions are system-generated incrementing snapshots.
- Skill description belongs to each version snapshot.
- Each version is a complete logical snapshot of `SKILL.md` and resources.
- `SKILL.md` is the fixed main content path and is stored as a version resource.
- R2 objects are physically deduplicated by SHA-256.
- Version resources reference R2 objects directly by SHA-256.

## `skills`

Managed Skill primary table.

```ts
skills {
  id: number
  name: string
  currentVersionId: number
  createdAt: Date
  updatedAt: Date
}
```

Constraints:

```text
primary key: id
foreign key: currentVersionId -> skill_versions.id
```

Behavior:

- `id` is the only primary identity.
- `name` may duplicate.
- `currentVersionId` points to the current version.
- `description` lives on `skill_versions` because updating it creates a new version.

## `skill_versions`

Logical snapshots for Managed Skills.

```ts
skill_versions {
  id: number
  skillId: number
  versionNumber: number
  description: string
  label: string | null
  changeSummary: string | null
  createdAt: Date
}
```

Constraints:

```text
primary key: id
foreign key: skillId -> skills.id
unique: (skillId, versionNumber)
```

Behavior:

- Creating a skill generates version `1`.
- Patching a skill generates version `N + 1`.
- Restoring a version copies historical resource references and description, then generates version `N + 1`.
- `description` is versioned with the content snapshot.
- `SKILL.md` is represented by a `skill_resources` row for the version.
- `label` is an optional user-facing version label.

## `skill_resources`

Resource manifest rows for one complete Managed Skill Version snapshot.

```ts
skill_resources {
  id: number
  skillVersionId: number
  path: string
  sha256: string
  mediaType: string
  size: number
  createdAt: Date
}
```

Constraints:

```text
primary key: id
foreign key: skillVersionId -> skill_versions.id
unique: (skillVersionId, path)
index: sha256
```

Behavior:

- A resource row belongs to a specific version.
- Each version has a complete resource manifest.
- Historical version resources remain readable.
- `SKILL.md` is the main content resource path.
- Resource rows reference deduplicated R2 objects directly by SHA-256.
- R2 object keys are derived from SHA-256, for example `objects/sha256/{sha256}`.
- Writing a resource first checks whether the SHA-256 object already exists in R2.
- Existing objects are reused when content is unchanged across versions or skills.

## `skill_origins`

GitHub provenance metadata for forked Managed Skills.

```ts
skill_origins {
  id: number
  skillId: number
  kind: "github"
  url: string
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}
```

Constraints:

```text
primary key: id
foreign key: skillId -> skills.id
```

Behavior:

- Only GitHub origins are in scope for now.
- `kind` identifies the origin adapter type.
- `url` is the GitHub repository URL.
- `metadata` is a JSON field for adapter-specific details such as branch, resolved revision, and resolved skill path.
- User-created skills do not create origin records.
- The GitHub adapter resolves skill content from repository URL, branch, and Skill Name.

## Future: `skill_sets`

Skill Set design is deferred to a dedicated design pass.

```ts
skill_sets {
  id: number
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
}
```

```ts
skill_set_items {
  id: number
  skillSetId: number
  skillId: number
  versionPolicy: "current" | "pinned"
  pinnedVersionNumber: number | null
  createdAt: Date
}
```

## Future: Origin Comparison

Origin Comparison is deferred from the current contract scope.
