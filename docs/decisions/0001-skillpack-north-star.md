---
status: proposed
date: 2026-05-22
decision-makers: Sean
consulted: skills.sh local codebase, Agent Skills integration documentation, Skillpack backend architecture guidance
informed: Future Skillpack maintainers and coding agents
---

# ADR-0001: Define Skillpack as a Skill Aggregator and Delivery Layer

Skillpack is a skill aggregator and delivery layer for agents. It aggregates skills from multiple sources, normalizes them into Skill Entries, applies Skill Trust as a safety and curation buffer, and delivers resolved skill content to agent runtimes through Skillpack-mediated interfaces.

## Decision

Skillpack's high-level system model is:

```text
Skill Source -> Skill Entry -> Skill Trust -> Skill Delivery
```

This model is the north star for future architecture and product decisions.

## Core Concepts

### Skill Source

A Skill Source is an origin that provides skills to Skillpack.

Examples:

- Skillpack-managed content created by users, agents, or API clients
- GitHub repositories
- npm packages
- Future external registries or discovery protocols

Skillpack-managed skills use `skillpack` as their source. User-authored, agent-created, and API-created skills are creation modes inside that source type.

### Skill Entry

A Skill Entry is the primary object in Skillpack. All sources normalize into the same Skill Entry model.

A Skill Entry represents a skill that users can understand and agents can consume. Source-specific differences such as content ownership, revision semantics, and sync behavior belong to the source adapter and provenance model.

### Skill Trust

Skill Trust is the curation and safety state between source updates and agent consumption.

Bare Skill Locations resolve to the current approved revision or version. Source sync may discover newer content, but agent consumption stays on approved content until trust state changes. Pinned locator behavior is governed by configurable Delivery Policy; detailed safety policy design is deferred.

### Skill Delivery

Skill Delivery is the agent-facing act of resolving Skill Locations into skill content and resource metadata through Skillpack-mediated interfaces such as APIs, MCP tools, or extension tools.

Materialized distribution, export, and agent-specific filesystem installation are deferred from the current north-star ADR.

## Skill Library

The Skill Library is a discovery-oriented view over Skill Entries, Skill Trust state, and organization metadata such as categories or tags. It helps users and agents find skills, but it is not a source type and not the delivery contract.

## Skill Location

A Skill Location is an agent-facing private `skill://` locator. Agents and harnesses resolve Skill Locations through Skillpack APIs, MCP tools, or extension tools to obtain `SKILL.md` content, resource manifests, and access metadata.

The first URI segment identifies the source type. Each source type owns the rest of its URI shape.

Canonical examples:

```text
skill://github/{owner}/{repo}/{skillName}
skill://skillpack/{handle}
skill://npm/{packageName}/{skillName}
```

GitHub uses `owner/repo + skillName` as its natural namespace. Skillpack-managed skills use a Skillpack-assigned handle, which usually equals the skill name because Skillpack-managed skills are business-constrained to unique names.

Bare Skill Locations resolve to current approved content. Qualified locations may request source-specific pins:

```text
skill://github/vercel-labs/skills/find-skills?ref=v1.2.0
skill://github/vercel-labs/skills/find-skills?rev=abc123
skill://skillpack/code-review?version=0.1.0
```

For GitHub, `ref` means a branch or tag name and `rev` means an immutable commit revision. Skillpack responses must expose the resolved immutable identity.

## Resolved Skill

Resolving a Skill Location produces a Resolved Skill.

A Resolved Skill includes:

- `content`: the `SKILL.md` body
- resource manifest
- resolved identity
- source provenance
- access metadata

Resource content is fetched separately through Skillpack-mediated read operations.

## Consequences

- Skillpack remains source-agnostic: GitHub, npm, Skillpack-managed content, and future registries all feed the same Skill Entry model.
- Skill Entry stays the primary product object. Skill Sets may exist as business groupings, but they do not replace Skill Entry as the primary object.
- User-facing import can remain familiar product language while internal architecture treats import as adding or updating Skill Entries from Skill Sources.
- Agent-facing integrations should pass `skill://` Skill Locations and resolve them through Skillpack rather than embedding raw upstream URLs or database IDs.
- Trust and approval become first-class system concerns because agent delivery should not automatically follow arbitrary source updates.
- Runtime resolution is the current delivery focus. Export/package/filesystem installation can be designed later as separate delivery modes.

## Deferred Decisions

- Detailed Delivery Policy and permission model
- GitHub source indexing schema and sync mechanics
- npm source support
- Well-known or registry discovery protocols
- Materialized distribution and package/export formats
- Full conflict UX for duplicate names across source namespaces
