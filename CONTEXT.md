# Skillpack Context

Skillpack is a product context for managing user-owned skills as platform-owned copies, organizing them into user-curated skill collections, and delivering them to agent runtimes.

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
A user-owned, platform-stored skill record in Skillpack's library that users can understand and agents can consume. Forked, user-authored, agent-created, and API-created skills all become Managed Skills once Skillpack stores and owns their content lifecycle for one user.
_Avoid_: Skill Entry, imported skill, raw source file, database row

**Fork**:
A workflow that creates or updates a user's Managed Skill from a Skill Origin or another Managed Skill. In user-facing UI, this workflow is presented as Add to Library. Forking expresses user ownership and responsibility for reviewing, curating, and maintaining the resulting Managed Skill.
_Avoid_: Import, sync, mirror

**Batch Fork**:
A Fork workflow that creates or updates Managed Skills for multiple selected Skills from one Skill Origin. Batch Fork uses partial success: one selected Skill failing to Fork does not prevent other selected Skills from becoming Managed Skills.
_Avoid_: All-or-nothing import, sync batch, origin mirror

**Origin Comparison**:
A lightweight review workflow that compares a Managed Skill with the current content available from its Skill Origin. In the MVP, GitHub-origin comparisons use the repository's default branch and produce a simple diff for user review.
_Avoid_: Sync, pull, merge, version-control history

**Skill ID**:
The Skillpack-owned internal opaque storage identity for a Managed Skill. A Skill ID may be pre-generated for storage workflows, but it is not a user-facing or agent-facing operation identifier and is not exposed by public API responses.
_Avoid_: Public handle, user-facing identifier, agent-facing locator, source identity, auto-increment number as product identity

**Skill Name**:
The lowercase-hyphen operation name for a Managed Skill inside one user's Skill Library. A Skill Name is immutable after creation, must be unique within that user's Library, and is the only public operation identity for user-facing interfaces, APIs, and agent-facing delivery. Different Skill Names identify different Managed Skills; changing a Skill Name means creating a new Managed Skill.
_Avoid_: Global name, version name, display-only label, numeric Skill ID as user-facing identity, public UUID as skill identity

**Skill Location**:
An agent-facing private `skill://skillpack/{skillName}` locator derived from Skill Name within an authorized user context. Agents and harnesses resolve Skill Locations through Skillpack APIs, MCP tools, or extension tools to obtain `SKILL.md`, resources, and access metadata; the URI itself is not a fetchable content URL.
_Avoid_: Numeric ID locator, source-qualified locator, GitHub locator, raw URL, direct download URL

**Skill Location Pin**:
An optional qualifier on a Skill Location that binds resolution to a Managed Skill Version number. Bare Skill Locations resolve to the current version.
_Avoid_: Source ref, source identity, user-authored version name, current pointer to historical version

**Managed Skill Version**:
A Skillpack-owned complete content snapshot for a Managed Skill, identified by a system-generated version number. A Managed Skill Version contains the canonical `SKILL.md` content plus its Resource Manifest; a new version is created by durable actions such as create, save, restore, Add to Library updates, or accepting an Origin Comparison. A Managed Skill Version does not own the Skill Name.
_Avoid_: Semver requirement, every keystroke as version, incremental patch, current R2 deduplication, Git ref, Git revision, version name

**Resolved Skill**:
The concrete content view produced by resolving a Skill Location at a point in time. A Resolved Skill includes `content` for the `SKILL.md` body, a resource manifest, resolved Skill Name, provenance, and access metadata.
_Avoid_: Managed Skill, raw file, internal Skill ID in public resolved output

**Resource Manifest**:
The complete list of non-`SKILL.md` resources attached to a Managed Skill Version, including paths and metadata needed to request each resource through Skillpack. A Resource Manifest has no independent product identity or version line; its identity comes from the owning Managed Skill Version, not from an R2 object path.
_Avoid_: Cross-version resource state, resource content bundle, resource patch as storage model, SKILL.md manifest item, independent resource version, R2 path as resource identity

**Resource Path**:
A safe relative path for a Resource Manifest item, resolved from the directory containing `SKILL.md` and following agent skills conventions. A Resource Path may include `/` for nested files, is unique within one Resource Manifest, and is not an origin repository path.
_Avoid_: Absolute path, origin repo path, display label, cross-version resource identity

**Skill Trust**:
The curation and safety metadata Skillpack maintains for a Managed Skill, including provenance, review signals, current version, and risk metadata. User review is a product workflow that guides responsible skill use.
_Avoid_: Popularity score, source metadata only, approval-only state machine

**Delivery Policy**:
A user-configurable policy that controls how Skillpack resolves Skill Locations for agent consumption, including how explicit version pins are handled.
_Avoid_: Backend approval gate, hard-coded system rule

**Skill Library**:
A user's discovery-oriented view over their Managed Skills, Skill Trust state, and organization metadata such as categories or tags. The Skill Library helps users and agents find skills in that user's owned collection.
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
