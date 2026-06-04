# Origin Comparison Design Handoff

Origin Comparison is deferred from the Skill-centric Managed Skill refactor. Managed Skills store nullable origin JSON as provenance on the current Skill state, and Skill Snapshots capture origin JSON as part of whole-state snapshotting.

Origin Comparison should compare a Managed Skill's current state with content currently available from its Skill Origin. It remains a review workflow, not upstream sync or version-control history.

Open decisions:

- Comparison request contract: target Skill Name plus origin-specific comparison inputs such as repository branch, ref, or revision.
- Diff representation for `SKILL.md` and additional Skill Resources.
- Review UX for accepting, rejecting, or selectively applying source changes.
- Whether accepted changes always replace the whole current Skill state or can apply selected files.
- How to surface repository changes without implying ongoing upstream tracking.

Constraint from the refactor:

- Accepting an Origin Comparison updates the Managed Skill's current state.
- For existing Managed Skills, accepting an Origin Comparison creates a pre-update Skill Snapshot by default.
- GitHub remains provenance for Fork and comparison, not primary Managed Skill identity.
