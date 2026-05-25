# Skill Set Design Handoff

Skill Set design is deferred from the Managed Skill refactor. The current model leaves Skill Sets to reference Managed Skills by Skill ID and, when needed, numeric Managed Skill Version pins.

Open decisions:

- Skill Set identity, naming, and description fields.
- Membership table shape and ordering model.
- Per-item version policy: current version, pinned version, or both.
- Activation targets: agent, project, workflow, runtime, or user profile.
- Delivery API shape and whether delivery resolves full resources or only manifests.
- UI flows for composing, sorting, grouping, enabling, and disabling Skill Set items.

Constraint from the refactor:

- Skill Set membership must not depend on Skill Name uniqueness.
- Skill Set delivery must not reintroduce source-qualified Managed Skill identity.
