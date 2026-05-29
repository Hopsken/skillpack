# Skill Delivery Design

Skill Delivery exposes Skillpack-managed Agent Skills to Pi Coding Agent without mapping remote skills onto the local filesystem. Pi's current `resources_discover` path is still local-skill oriented, so Skillpack delivery uses a prompt catalog plus explicit read tools.

## Decision

Skillpack Managed Skills are advertised to Pi through a system prompt catalog injected by the Pi extension at `before_agent_start`.

Each catalog entry contains:

- Skill name
- Description
- `skill://skillpack/{skillId}` locator
- Current numeric version

When the agent needs the full skill instructions, it calls `skillpack_read` with the `skill://` locator and no `path`. That result includes the raw `SKILL.md` content with frontmatter plus the attached resource paths inside the same `<skill>` wrapper. Attached resources are read with the same tool by passing a resource `path`.

This keeps `skill://` locations out of normal filesystem reads and avoids pretending remote Skillpack resources are local paths.

## Pi Extension

The extension lives at `packages/pi-extension` as `@skillpack/pi-extension`.

Responsibilities:

- Register Skillpack as Pi OAuth provider `skillpack`.
- Read credentials from Pi auth storage through normal `/login skillpack` flow.
- Call Skillpack APIs with `Authorization: Bearer <access-token>`.
- Inject the authenticated user's Skill Library catalog into the system prompt.
- Register `skillpack_read` for the skill activation payload, preserving `SKILL.md` frontmatter and listing attached resources.
- Register `/skillpack` for listing, selecting, and activating Skillpack skills.

The `/skillpack` command accepts a skill ID, skill name, or `skill://skillpack/{skillId}` location. With no arguments, it opens a selector. Selecting a skill pre-fills `/skillpack:{name} ` in the editor so the user can add task prompt text before sending.

## Locator

Current version:

```text
skill://skillpack/{skillId}
```

Pinned version:

```text
skill://skillpack/{skillId}?version={versionNumber}
```

Delivery identity is always Skill ID plus optional numeric version. GitHub URLs, source-qualified paths, and display names are not delivery identity.

## API Reuse

No new server delivery API is required for v1. The extension uses the existing authenticated Skillpack API:

```text
GET /api/v1/skills
GET /api/v1/skills/:skillId
GET /api/v1/skills/:skillId?version=:version
GET /api/v1/skills/:skillId/resources?version=:version&path=:path
GET /api/v1/skills/:skillId/resources/raw?version=:version&path=:path
```

## Auth

The extension registers a standard OAuth PKCE provider under Pi provider id `skillpack`.

OAuth behavior:

- Prompt the user for the Skillpack base URL during `/login skillpack`.
- Discover authorization server metadata from `/.well-known/oauth-authorization-server`, falling back to `/.well-known/openid-configuration`.
- Discover protected resource metadata from `/.well-known/oauth-protected-resource`.
- Dynamically register a public OAuth client with the local callback redirect URI.
- Use authorization-code + PKCE with the `skills:read` scope and Skillpack resource audience.
- Store access token, refresh token, client ID, resource, and base URL in Pi auth storage.
- Refresh tokens through the discovered token endpoint with the same resource audience.

There is no dev bypass in the extension.

## Intentional Non-Goals

- Do not use Pi `resources_discover` for Skillpack remote skills in v1.
- Do not register remote skills as local `/skill:name` filesystem skills.
- Do not introduce Skill Sets for v1 catalog scope.
- Do not add new Skillpack server delivery endpoints until existing API shape is insufficient.
