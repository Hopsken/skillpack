# Skillpack Context

Skillpack is a product context for aggregating skills from multiple sources, normalizing them as Skill Entries, governing consumability through Skill Trust, and delivering them to agent runtimes.

## Language

**Skillpack**:
A skill aggregator and delivery layer for agents. Its core pipeline is Skill Source → Skill Entry → Skill Trust → Skill Delivery.
_Avoid_: Skill CMS, GitHub importer, native registry

**Skill**:
A reusable instruction package intended for agent consumption. A skill may include a `SKILL.md` file plus optional resources such as scripts, references, and assets.
_Avoid_: Prompt snippet, plugin, tool

**Skill Source**:
An origin that provides skills to Skillpack, such as Skillpack-managed content, GitHub, npm, or another registry. User-authored, agent-created, and API-created skills are all Skillpack-managed when Skillpack stores and owns their content lifecycle.
_Avoid_: Import backend, upstream repo, native source

**Skill Entry**:
A skill record in Skillpack's library that users can understand and agents can consume. All Skill Sources normalize into the same Skill Entry model; provenance, content ownership, revision semantics, and sync behavior vary by source.
_Avoid_: Raw source file, database row

**Skill Entry Name**:
The human-readable name used for display and discovery. Multiple Skill Entries may share the same Skill Entry Name across source namespaces. Skillpack-authored Skill Entries are business-constrained to unique names.
_Avoid_: Global primary identity

**Skill Location**:
An agent-facing private `skill://` locator that names a Skill Entry in a source-qualified form. Agents and harnesses resolve Skill Locations through Skillpack APIs, MCP tools, or extension tools to obtain `SKILL.md`, resources, and access metadata; the URI itself is not a fetchable content URL.
_Avoid_: Database ID, raw URL, direct download URL

**Skill Location Namespace**:
The first segment of a Skill Location, identifying the Skill Source type that owns the rest of the URI shape. GitHub locations use `skill://github/{owner}/{repo}/{skillName}`; Skillpack-authored locations use `skill://skillpack/{handle}`, where the handle usually equals the Skill Entry Name.
_Avoid_: Global namespace table

**Skill Location Pin**:
An optional qualifier on a Skill Location that binds resolution to a source ref, immutable revision, or version. Bare Skill Locations resolve to the current approved Skill Entry revision or version; GitHub locations use `ref` for branch or tag names and `rev` for immutable commit revisions; Skillpack-managed locations may pin by version.
_Avoid_: Default locator, source identity

**Ref**:
A source-owned movable pointer such as a GitHub branch or tag. Resolving a Ref must produce an immutable Revision in Skillpack responses.
_Avoid_: Revision, version

**Revision**:
An immutable source content identity such as a Git commit SHA. Revisions are used when reproducibility matters.
_Avoid_: Ref, display version

**Version**:
A Skillpack-managed Skill Entry's named content version. Bare Skillpack Skill Locations resolve to the current version; `version` pins resolution to a specific Skillpack-managed version.
_Avoid_: Git ref, Git revision

**Resolved Skill**:
The concrete content view produced by resolving a Skill Location at a point in time. A Resolved Skill includes `content` for the `SKILL.md` body, a resource manifest, resolved identity, source provenance, and access metadata.
_Avoid_: Skill Entry, raw file

**Resource Manifest**:
The list of resources attached to a Resolved Skill, including paths and metadata needed to request each resource through Skillpack. Resource content is fetched separately from the default resolve response.
_Avoid_: Resource content bundle

**Skill Trust**:
The curation and safety state Skillpack maintains for a Skill Entry, including provenance, review status, approved revision or version, and risk metadata. Skill Trust acts as a safety buffer between source updates and agent consumption; bare Skill Locations resolve to the current approved revision or version. Pinned Skill Location behavior is governed by user-configurable delivery policy.
_Avoid_: Popularity score, source metadata only

**Delivery Policy**:
A user-configurable policy that controls how Skillpack resolves Skill Locations for agent consumption, including whether explicit pins may resolve content outside the current approved revision or version.
_Avoid_: Hard-coded system rule

**Skill Library**:
A discovery-oriented view over Skill Entries, Skill Trust state, and organization metadata such as categories or tags. The Skill Library helps users and agents find skills but is not a Skill Source or delivery contract.
_Avoid_: Database table, raw registry, delivery interface

**Skill Set**:
A business grouping of Skill Entries for a purpose such as an agent profile, project, category, or package. Skill Sets help organize delivery but do not replace Skill Entry as the primary object.
_Avoid_: Primary skill object, runtime contract

**Skill Delivery**:
The agent-facing act of making Skill Entries available to an agent runtime through Skillpack-mediated resolution interfaces such as APIs, MCP tools, or extension tools. Delivery may use Skill Sets as an organizing concept.
_Avoid_: Download, deploy, export, package

## Example Dialogue

Developer: Should GitHub import copy every file into Skillpack?
Domain expert: Import adds GitHub as a Skill Source and makes selected skills visible in the Skill Library. Durable copies are a separate delivery or preservation concern.

Developer: Is a user-authored skill a native skill?
Domain expert: Call it a Skillpack-managed skill. User-authored, agent-created, and API-created skills are all Skillpack-managed when Skillpack stores and owns their content lifecycle.

Developer: Is MCP the main product?
Domain expert: MCP is one possible Skill Delivery interface. Skillpack remains the aggregator and delivery layer across multiple agent-facing interfaces.
