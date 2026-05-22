# Goal: North Star Refactor

Refactor Skillpack's current MVP implementation around the ADR-0001 north-star model: Skill Source → Skill → Skill Trust → Skill Delivery. The first implementation source is `skillpack`, representing Skillpack-managed skills; future sources such as GitHub and npm remain deferred.

Use `facts.md` as the accepted shared understanding for the expected behavior and scope. Use `plan.md` as the execution plan for schema, backend, API, frontend, seed, and verification work.

Done when the accepted facts are implemented and verified, and `pnpm check`, `pnpm typecheck`, and `pnpm build` pass.
