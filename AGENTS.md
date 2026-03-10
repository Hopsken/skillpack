# AGENTS.md

Sean owns this repo.

## Mission

- personal skill pack
- reusable across Codex, Claude Code, Pi, OpenClaw, others
- canonical artifact = `skills/<skill-name>/SKILL.md`

## Default Path

- read `README.md`
- read target `skills/<name>/SKILL.md`
- keep changes tight; avoid unrelated churn
- leave breadcrumb notes in thread

## Skill Constraints

- OpenClaw/Pi compatibility first
- frontmatter keys: single-line only
- `metadata`: single-line JSON only
- folder names: kebab-case
- skill names: kebab-case; stable over time
- prefer `{baseDir}` for local helper paths
- helpers live beside the skill: `assets/`, `scripts/`, `examples/`

## When Adding Or Editing Skills

- start from `skills/_templates/base/`
- fix root cause, not wrapper noise
- keep descriptions concrete; easy to discover
- run `npm run validate`
- run `npm run list`

## Avoid

- harness-specific forks unless unavoidable
- multiline frontmatter values
- hidden state outside repo
