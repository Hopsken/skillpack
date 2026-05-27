---
status: proposed
date: 2026-05-27
decision-makers: Sean
consulted: Current Skillpack codebase, CONTEXT.md, Better Auth OAuth Provider docs, MCP authorization guidance
informed: Future Skillpack maintainers and coding agents
---

# ADR-0004: Make Skillpack an OAuth Provider for Skill Access

## Context

Skillpack already uses Better Auth with a generic OIDC provider for user login.
Future Skill Delivery clients, including MCP servers and harness extensions,
need a standard OAuth login flow so they can read a user's Managed Skills
without receiving a browser session cookie.

MCP is one possible client and transport, not the core product resource. The
resource being authorized is the user's Skillpack Managed Skill Library.

## Decision

Skillpack will also run a Better Auth OAuth Provider.

The provider issues OAuth tokens for read-only access to the authenticated
user's Managed Skills. Public clients are supported through authorization code
with PKCE because installed MCP servers and local harness extensions cannot
securely store client secrets.

For v1:

- Dynamic client registration is enabled, including unauthenticated registration.
- Registered public clients use `token_endpoint_auth_method: "none"` and PKCE.
- The supported Skillpack scope is `skills:read`.
- Refresh tokens are supported through `offline_access`.
- The valid OAuth audience/resource is the Skillpack `baseURL`.
- Existing skills GET routes accept either the normal Better Auth session cookie
  or an OAuth Bearer token with `skills:read`.
- Skills write routes continue to require the browser session cookie.

## Consequences

- Skillpack remains the OAuth client for user login and becomes the OAuth
  authorization server for delivery clients.
- OAuth tables and JWKS state are Better Auth infrastructure, not Skillpack
  domain tables.
- Skill Set scoped authorization is deferred until Skill Set itself is designed.
- Future MCP tools should use these OAuth tokens instead of introducing a
  separate auth model.

## Alternatives Considered

### Bind the token audience to `/mcp`

Rejected because MCP is only one future client shape. The permission should name
Skillpack skill access, not one transport.

### Require pre-registered confidential clients

Rejected because installed clients cannot reliably keep a shared client secret,
and manual client setup would make the intended installation flow awkward.

### Implement MCP tools immediately

Rejected for this slice. OAuth infrastructure and read access on existing skill
resources is enough to unblock future delivery-layer work.
