# skillpack

Personal collection of agent skills reused across agent harnesses, including Codex, Claude Code, Pi, OpenClaw, and similar setups.

Canonical format: each skill lives in its own folder and uses `SKILL.md` as the source of truth. This repo optimizes for OpenClaw and Pi compatibility first, then keeps harness-specific wrappers thin or derived.

## Goals

- Keep skills portable, reviewable, local-first.
- Avoid harness lock-in.
- Reuse one skill definition across multiple agent runtimes.
- Support direct loading from OpenClaw skill folders.

## Layout

```text
skills/
  _templates/
    base/
      SKILL.md
      README.md
  workspace-intake/
    SKILL.md
docs/
  harnesses/
    openclaw.md
    reuse.md
scripts/
  _lib/
    skills.mjs
  list-skills.mjs
  validate-skills.mjs
AGENTS.md
```

## Skill Rules

- One skill per folder.
- Canonical file: `skills/<skill-name>/SKILL.md`.
- Keep frontmatter keys single-line.
- Keep `metadata` as single-line JSON for OpenClaw/Pi compatibility.
- Use kebab-case for folder names and skill names.
- Prefer `{baseDir}` when a skill needs local helper files.
- Put optional helpers beside the skill: `assets/`, `scripts/`, `examples/`.

## Quick Start

1. Copy `skills/_templates/base/` into a new `skills/<skill-name>/` folder.
2. Edit `SKILL.md`.
3. Run `npm run validate`.
4. Run `npm run list`.

## OpenClaw

OpenClaw can load this repo directly as a shared skill pack. Add the repo's `skills/` directory to `~/.openclaw/openclaw.json`:

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

You can also copy or symlink a skill into an OpenClaw workspace at `./skills`.

More detail: [docs/harnesses/openclaw.md](./docs/harnesses/openclaw.md)

## Reuse Across Harnesses

OpenClaw and Pi can use the skill folders directly. Codex, Claude Code, and other harnesses should treat `SKILL.md` as canonical source text and keep any wrapper files minimal.

More detail: [docs/harnesses/reuse.md](./docs/harnesses/reuse.md)
