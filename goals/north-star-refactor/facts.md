# Facts

- The backend data model is rebuilt around the north-star concepts rather than preserving the existing MVP schema or local data.
- The first implemented source type is skillpack, representing Skillpack-managed skills created by users, agents, or API clients.
- The schema and shared contracts leave room for future source types such as github and npm, but this goal does not implement GitHub or npm indexing.
- The public API continues to use skills as the user-facing resource name while the implementation treats each skill as a Skill.
- The API uses source-qualified skill paths: `/api/v1/skills/:sourceType/*locator` for reading and deleting a skill.
- Resource reads use the skill path plus a path query: `/api/v1/skills/:sourceType/*locator/resources?path=...` and `/api/v1/skills/:sourceType/*locator/resources/raw?path=...`.
- Skillpack-managed skills have canonical locations in the form `skill://skillpack/{handle}`.
- Bare skill reads resolve to the current approved version and return a Resolved Skill containing content, resource manifest, source provenance, resolved identity, and trust status.
- `GET /api/v1/skills/skillpack/{handle}?version={version}` returns that specific Skillpack-managed version when it exists.
- New Skillpack-managed versions are auto-approved in the MVP and update the current approved version.
- The frontend route for skill details uses the source-qualified shape `/skills/skillpack/:handle`.
- The frontend keeps the current library/detail/resource viewer layout while updating data flow and visible metadata to the north-star model.
- The backend remains in `server/modules/skills`, with internal types and service functions named around Skill, Skill Location, Resolved Skill, Source, and Trust.
- The goal is complete when `pnpm check`, `pnpm typecheck`, and `pnpm build` pass.
