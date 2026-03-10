# Reuse Notes

This repo keeps one canonical skill definition and reuses it across harnesses.

## Canonical Source

- `skills/<skill-name>/SKILL.md` is primary
- optional helpers stay in the same folder
- wrappers should point back to the same folder, not fork the instructions

## Harness Pattern

- OpenClaw: load folders directly
- Pi: same `SKILL.md` layout works
- Codex: reference or adapt the same skill text into local harness instructions when needed
- Claude Code: same rule; thin wrapper only

## Policy

- do not maintain multiple divergent copies of one skill
- if a harness needs extra framing, put only the harness-specific shim in that harness
- keep operational steps, commands, and helper paths in the shared `SKILL.md`
