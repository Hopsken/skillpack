# Origin Comparison Design Handoff

Origin Comparison is deferred from the Managed Skill refactor. The current implementation stores GitHub provenance on forked Managed Skills so a later comparison workflow can choose a branch or revision and compare it with a Skillpack-owned version snapshot.

Open decisions:

- Comparison request contract: source branch, source revision, target Skill Name, and target version. Internal services may resolve the Skill Name to a Skill ID.
- Diff representation for `SKILL.md` and additional Skill Resources.
- Review UX for accepting, rejecting, or selectively applying source changes.
- Version creation behavior after accepting a comparison.
- How to surface repository changes without implying ongoing upstream tracking.

Constraint from the refactor:

- Comparison must create a new Managed Skill Version when accepted.
- GitHub remains provenance for Fork, not primary Managed Skill identity.
