---
name: workspace-intake
description: Build a fast map of an unfamiliar repo: purpose, entrypoints, commands, constraints, and likely risk areas.
metadata: {"openclaw":{"emoji":"🧭","always":true}}
---

Use this skill when you enter a repo cold and need a low-noise map before editing.

## Workflow

1. List top-level files and directories with `fd`.
2. Read the primary docs and repo instructions first.
3. Search for build, test, lint, and entrypoint commands with `rg`.
4. Identify the smallest set of files that define behavior.
5. Summarize:
   - repo purpose
   - stack and runtime
   - important commands
   - risky or high-churn areas
   - best next action

## Constraints

- prefer root-cause understanding over quick guesses
- keep the first pass short
- call out missing docs or ambiguous ownership
