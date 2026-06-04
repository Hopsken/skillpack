# Skill Set Design Handoff

Skill Set design is deferred from the Skill-centric Managed Skill refactor. Public Skill Set contracts should reference Managed Skills by Skill Name in the authenticated user's Library. Internal persistence may resolve Skill Names to internal Skill IDs.

Skill Set delivery should resolve current Managed Skill state. Stable version pins are outside the current Skill Delivery model.

Open decisions:

- Skill Set identity, naming, and description fields.
- Membership table shape and ordering model.
- Whether membership stores Skill Name, Skill ID, or both.
- Activation targets: agent, project, workflow, runtime, or user profile.
- Delivery API shape and whether delivery resolves structured Skill state, rendered `SKILL.md`, full resources, or only manifests.
- UI flows for composing, sorting, grouping, enabling, and disabling Skill Set items.

Constraint from the refactor:

- Skill Set membership in public contracts must use Skill Name in the authenticated user's Library; internal persistence may use Skill ID foreign keys.
- Skill Set delivery must not reintroduce source-qualified Managed Skill identity.
- Skill Set delivery must not reintroduce stable version pins without a later ADR introducing a release/publish concept.
