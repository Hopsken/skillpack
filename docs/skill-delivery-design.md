# Skill Delivery Design Handoff

Skill Delivery and agent-facing resolution are deferred from the Managed Skill refactor. The current implementation establishes Skill ID and numeric Managed Skill Versions as the stable foundation for later delivery behavior.

Open decisions:

- Delivery locator shape for current and pinned Managed Skill Versions.
- Runtime API contract for resolving `SKILL.md`, manifests, and raw Skill Resources.
- Access-control behavior for agent, project, and workflow consumers.
- Packaging policy for complete snapshots versus lazy resource fetches.
- Cache invalidation and stale-version behavior.

Constraint from the refactor:

- Delivery must resolve Managed Skills by Skill ID and numeric version.
- Delivery must not expose GitHub URLs or source-qualified paths as Managed Skill identity.
