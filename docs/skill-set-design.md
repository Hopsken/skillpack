# Skill Set Design Handoff

Skill Set design is deferred from the Managed Skill refactor. Public Skill Set contracts should reference Managed Skills by Skill Name and, when needed, numeric Managed Skill Version pins. Internal persistence may resolve Skill Names to internal Skill IDs.

Open decisions:

- Skill Set identity, naming, and description fields.
- Membership table shape and ordering model.
- Per-item version policy: current version, pinned version, or both.
- Activation targets: agent, project, workflow, runtime, or user profile.
- Delivery API shape and whether delivery resolves full resources or only manifests.
- UI flows for composing, sorting, grouping, enabling, and disabling Skill Set items.

Constraint from the refactor:

- Skill Set membership in public contracts must use Skill Name in the authenticated user's Library; internal persistence may use Skill ID foreign keys.
- Skill Set delivery must not reintroduce source-qualified Managed Skill identity.
