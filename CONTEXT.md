# Skillpack Context

Skillpack is a product context for managing skills as platform-owned copies, organizing them into user-curated skill collections, and delivering them to agent runtimes.

## Language

**Skillpack**:
A Skills Management Platform for agents. Its core pipeline is Skill Origin → Forked or Authored Managed Skill → Skill Trust → Skill Set → Skill Delivery.
_Avoid_: Aggregator, delivery layer, GitHub importer, native registry

**Skill**:
A reusable instruction package intended for agent consumption. A skill may include a `SKILL.md` file plus optional resources such as scripts, references, and assets.
_Avoid_: Prompt snippet, plugin, tool

**Skill Origin**:
The provenance of a Managed Skill before it entered Skillpack, such as GitHub, npm, another registry, user authoring, agent creation, or API creation. Origins are metadata attached to Managed Skills and never form the skill's primary identity.
_Avoid_: Skill Source, source type, import backend, upstream identity, native source

**Origin Adapter**:
A Skillpack capability that knows how to discover Skills at a specific kind of Skill Origin and read a selected Skill's definition and resources so Skillpack can Fork it into a Managed Skill.
_Avoid_: Source adapter, importer, sync backend, registry identity

**Managed Skill**:
A platform-owned skill record in Skillpack's library that users can understand and agents can consume. Forked, user-authored, agent-created, and API-created skills all become Managed Skills once Skillpack stores and owns their content lifecycle.
_Avoid_: Skill Entry, imported skill, raw source file, database row

**Fork**:
A workflow that creates a Managed Skill copy from a Skill Origin or another Managed Skill. Forking expresses user ownership and responsibility for reviewing, curating, and maintaining the resulting Managed Skill.
_Avoid_: Import, sync, mirror

**Batch Fork**:
A Fork workflow that creates Managed Skill copies for multiple selected Skills from one Skill Origin. Batch Fork uses partial success: one selected Skill failing to Fork does not prevent other selected Skills from becoming Managed Skills.
_Avoid_: All-or-nothing import, sync batch, origin mirror

**Origin Comparison**:
A lightweight review workflow that compares a Managed Skill with the current content available from its Skill Origin. In the MVP, GitHub-origin comparisons use the repository's default branch and produce a simple diff for user review.
_Avoid_: Sync, pull, merge, version-control history

**Skill ID**:
The Skillpack-owned primary identity for a Managed Skill. All system operations and Skill Locations address Managed Skills by Skill ID.
_Avoid_: Handle, source identity, Skill Name as identity

**Skill Name**:
The human-readable name used for display and discovery. Multiple Managed Skills may share the same Skill Name, even for the same user.
_Avoid_: Handle, unique name, primary identity

**Skill Location**:
An agent-facing private `skill://skillpack/{skillId}` locator derived from Skill ID. Agents and harnesses resolve Skill Locations through Skillpack APIs, MCP tools, or extension tools to obtain `SKILL.md`, resources, and access metadata; the URI itself is not a fetchable content URL.
_Avoid_: Source-qualified locator, GitHub locator, handle locator, raw URL, direct download URL

**Skill Location Pin**:
An optional qualifier on a Skill Location that binds resolution to a Managed Skill Version number. Bare Skill Locations resolve to the current version.
_Avoid_: Source ref, source identity, user-authored version name, current pointer to historical version

**Managed Skill Version**:
A Skillpack-owned complete content snapshot for a Managed Skill, identified by a system-generated version number. A new version is created by durable actions such as create, save, restore, or accepting an Origin Comparison; users may optionally add labels to important versions.
_Avoid_: Semver requirement, every keystroke as version, incremental patch, current R2 deduplication, Git ref, Git revision

**Resolved Skill**:
The concrete content view produced by resolving a Skill Location at a point in time. A Resolved Skill includes `content` for the `SKILL.md` body, a resource manifest, resolved Skill ID, provenance, and access metadata.
_Avoid_: Managed Skill, raw file

**Resource Manifest**:
The list of resources attached to a Managed Skill Version, including paths and metadata needed to request each resource through Skillpack. Resource content is fetched separately from the default resolve response.
_Avoid_: Cross-version resource state, resource content bundle

**Skill Trust**:
The curation and safety metadata Skillpack maintains for a Managed Skill, including provenance, review signals, current version, and risk metadata. User review is a product workflow that guides responsible skill use.
_Avoid_: Popularity score, source metadata only, approval-only state machine

**Delivery Policy**:
A user-configurable policy that controls how Skillpack resolves Skill Locations for agent consumption, including how explicit version pins are handled.
_Avoid_: Backend approval gate, hard-coded system rule

**Skill Library**:
A discovery-oriented view over Managed Skills, Skill Trust state, and organization metadata such as categories or tags. The Skill Library helps users and agents find skills.
_Avoid_: Database table, raw registry, delivery interface

**Skill Set**:
A user-curated collection of Managed Skills intended for an agent, project, workflow, or runtime context. Skill Sets express the complete skills collection a user wants to make available for a given use.
_Avoid_: Primary skill object, loose tag, raw folder

**Skill Delivery**:
The agent-facing act of making Managed Skills available to an agent runtime through Skillpack-mediated resolution interfaces such as APIs, MCP tools, or extension tools. Delivery may use Skill Sets as an organizing concept.
_Avoid_: Download, deploy, export, package

## Example Dialogue

Developer: Should GitHub import copy every file into Skillpack?
Domain expert: Call that workflow Fork. Fork creates a Managed Skill copy in Skillpack and records GitHub as the Skill Origin.

Developer: Should a GitHub fork keep syncing with upstream?
Domain expert: Use Origin Comparison for a simple diff against the current GitHub default branch, then create a new Managed Skill Version after user review.

Developer: Is a user-authored skill a native skill?
Domain expert: Call it a Managed Skill. User-authored, forked, agent-created, and API-created skills all become Managed Skills when Skillpack stores and owns their content lifecycle.

Developer: Is MCP the main product?
Domain expert: MCP is one possible Skill Delivery interface. Skillpack remains the Skills Management Platform across multiple agent-facing interfaces.
