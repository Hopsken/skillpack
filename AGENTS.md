# Skillpack Agent Guide

## Project Overview

Skillpack is a single Cloudflare Worker service that serves both:

- Hono API routes under `/api/*`
- Vite React SPA through Cloudflare static assets

The stack is Cloudflare Workers, Hono, D1, Drizzle ORM, R2, React, Vite, Tailwind CSS, shadcn/ui-style components, TypeScript, pnpm, and Zod.

## Project Layout

```text
client/   # Vite React SPA
server/   # Cloudflare Worker, Hono app, routes, D1 schema
shared/   # Zod schemas and shared TypeScript types
```

Key files:

```text
server/app.ts                 # Hono app composition
server/worker.ts              # Worker entrypoint
server/modules/skills/route.ts # Skills API routes
server/modules/skills/service.ts # Skills business flows
server/db/schema.ts           # Drizzle D1 schema
shared/schemas/skills.ts      # Zod schemas shared by API and SPA
client/app.tsx                # SPA entry UI
wrangler.jsonc                # Cloudflare Worker, D1, R2, assets config
vite.config.ts                # Vite + Cloudflare plugin config
```

## Commands

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm build
pnpm deploy
```

Database commands:

```bash
pnpm db:generate
pnpm db:migrate:local
pnpm db:migrate:remote
pnpm db:seed:local
```

Cloudflare resource setup:

```bash
wrangler d1 create skillpack
wrangler r2 bucket create skillpack-objects
```

After creating D1, update `wrangler.jsonc` with the production `database_id`.

## Architecture Notes

- Keep client and server code separated: `client/`, `server/`, and `shared/`.
- Use `tsconfig.client.json` and `tsconfig.server.json`; root `tsconfig.json` only contains project references.
- Must read `docs/backend-architecture.md` before adding or reorganizing backend files.
- Backend code follows module-first architecture under `server/modules/<module>/` with lightweight `route/service/repository/storage/presenter` layers.
- In server code, prefer the `@server/*` alias for cross-module or deep imports instead of long relative paths like `../../../`.
- Keep Hono route files focused on HTTP concerns; move business logic to module services, D1 access to repositories, and R2 access to storage helpers.
- Use shared Zod schemas from `shared/schemas/*` for request/response validation and client parsing.
- Use Cloudflare bindings directly through `c.env`; avoid Cloudflare REST calls from inside the Worker.
- Store skill content in R2 and store metadata/manifests in D1.

## Frontend Architecture

Must read doc: `docs/frontend-structure.md` before adding or moving frontend files.

Frontend source lives in `client/`. It is built with Vite (`vite.config.ts`), uses React Router.

**Import convention**: prefer the `@/*` path alias (e.g., `@/domain/charts`) over relative paths for cross-layer imports. The alias is defined in `tsconfig.client.json`.

Before adding or moving frontend files, follow its `pages / features / domain / components / shared` structure.

Core frontend boundaries:

- `pages/` — thin route entries only.
- `features/` — user workflows, Zustand state, and feature-specific API hooks.
- `domain/` — pure business models, transformations, validation, and rules.
- `components/` — reusable business UI blocks.
- `components/ui` — reusable UI components, from shadcn UI.
- `shared/` — generic app infrastructure, components, hooks, and utilities.

State management rule: TanStack Query owns server state from APIs; Zustand owns client interaction state in `features/<feature>/store/`; React Context is only for cross-cutting platform plumbing. Do not duplicate API data into Zustand stores.

## Data Model Notes

- Skillpack-managed skills use `source_type = "skillpack"`.
- Skillpack-managed handles are unique per source and usually equal the skill name.
- Skill content is stored at `skills/skillpack/{handle}/{version}/SKILL.md` in R2.
- `skill_versions` keeps version metadata, object keys, SHA-256 values, resolved locations, and approval timestamps.

## API

```text
GET  /api/health
GET  /api/v1/skills
GET  /api/v1/skills/skillpack/:handle
GET  /api/v1/skills/skillpack/:handle?version=:version
GET  /api/v1/skills/skillpack/:handle/resources?version=:version&path=:path
GET  /api/v1/skills/skillpack/:handle/resources/raw?version=:version&path=:path
POST /api/v1/skills
DELETE /api/v1/skills/skillpack/:handle
```

Create a skill locally:

```bash
curl -X POST http://localhost:5173/api/v1/skills \
  -H 'content-type: application/json' \
  -d '{
    "name": "api-skill-demo",
    "description": "Demo API-backed skill",
    "version": "0.1.0",
    "content": "# Demo Skill\n\nUse this skill when validating API-backed skills."
  }'
```

## Gotchas

- `wrangler.jsonc` uses a production D1 `database_id`; local dev still uses Wrangler local state with the same `DB` binding.
- `pnpm db:seed:local` seeds local D1 and R2 through the running dev API at `http://localhost:5173`.
- `components.json` points shadcn/ui to `client/styles.css` and `@/components` aliases.
- Build output is generated under `dist/` and should stay untracked.
- `.DS_Store` should stay ignored and untracked.

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`

Oxlint + Oxfmt (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Oxlint + Oxfmt Can't Help

Oxlint + Oxfmt's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Oxlint + Oxfmt can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Oxlint + Oxfmt. Run `pnpm dlx ultracite fix` before committing to ensure compliance.
