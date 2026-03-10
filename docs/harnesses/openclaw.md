# OpenClaw Notes

This repo uses OpenClaw-compatible skill folders.

## Required Format

- Each skill is a directory containing `SKILL.md`.
- `SKILL.md` uses YAML frontmatter.
- Frontmatter keys should stay single-line.
- `metadata` should stay single-line JSON.

Example:

```md
---
name: workspace-intake
description: Map a repo fast; entrypoints, commands, constraints, risks.
metadata: {"openclaw":{"emoji":"🧭","always":true}}
---
```

## Load This Repo In OpenClaw

Shared pack:

```json
{
  "skills": {
    "load": {
      "extraDirs": [
        "/absolute/path/to/skillpack/skills"
      ]
    }
  }
}
```

Per-workspace pack:

- copy or symlink skills into `<workspace>/skills`

## Precedence

- `<workspace>/skills`
- `~/.openclaw/skills`
- bundled skills
- `skills.load.extraDirs`

If names conflict, higher-precedence folders win.

## Practical Repo Rules

- Treat `SKILL.md` as source of truth.
- Keep folder names stable; OpenClaw resolves by skill name.
- Use `metadata.openclaw` only when gating or UI metadata is needed.
- Skip fancy YAML. Parser assumptions are intentionally strict.
