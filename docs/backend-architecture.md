# Backend Architecture

The backend uses a module-first architecture with lightweight internal layers. Hono owns the HTTP boundary. Business code lives in domain-oriented modules under `server/modules`.

The goal is to make code placement predictable: when adding or changing backend behavior, there should be one obvious module and one obvious layer for the change.

## Directory Layout

```text
server/
  app.ts
  worker.ts
  types.ts

  routes/
    index.ts

  modules/
    <module>/
      route.ts
      service.ts
      repository.ts
      presenter.ts
      errors.ts
      types.ts
      storage.ts        # only when this module owns object/blob storage
      packager.ts       # only when this module owns packaging/building logic

    origins/            # Skill Origin discovery and definition retrieval
      route.ts
      service.ts
      adapters/
        github.ts
        npm.ts

  db/
    client.ts
    schema.ts

  lib/
    crypto.ts
    http.ts
```

## Module Boundaries

A module represents a business capability boundary. Add a new module when a feature has its own lifecycle, rules, persistence, or external integrations.

Examples of module-sized capabilities:

- Resource CRUD and versioning
- Import workflows
- Classification and metadata workflows
- Collection, packaging, or export workflows
- Skill Origin discovery and definition retrieval

Shared low-level utilities belong in `server/lib`. Reusable server-only parsing or domain helpers belong in `server/shared` or the owning module. Database table definitions belong in `server/db/schema.ts`. Public API contracts shared by the frontend and backend belong in `shared/contract/*`.

## Layer Responsibilities

### `route.ts`

`route.ts` handles the HTTP layer only:

- Route paths
- Request param/query/json validation
- Middleware attachment points
- Calling service functions
- Mapping service errors to HTTP status codes
- Returning JSON, text, streams, or empty responses

Avoid putting these in `route.ts`:

- Drizzle queries
- R2 object key rules
- Hashing workflows
- Cross-table business rules
- Response mapping details
- Multi-step business orchestration

A route file should read like the API surface for the module.

### `service.ts`

`service.ts` handles use cases and business flows:

- Orchestrating repository, storage, Origin Adapter, and packaging helpers
- Enforcing business rules
- Managing cross-resource consistency strategy
- Throwing module-level errors
- Returning internal DTOs or presenter inputs

Rules:

- Services may call the same module's repository/storage helpers.
- Services may call another module's public service functions when crossing module boundaries.
- Services must not construct Hono responses.
- Services must not read `c.req` or depend on route/query/path details.

### `repository.ts`

`repository.ts` handles D1/Drizzle access only:

- Select, insert, update, delete
- Transaction helpers
- Complex DB queries
- DB row to repository DTO conversion

Rules:

- Repositories receive `D1Database` or a Drizzle database instance.
- Repositories must not access R2.
- Repositories must not construct HTTP responses.
- Repositories must not validate HTTP requests.
- Repositories must not depend on Hono context.

Managed Skill Version commits are a repository concern. The service prepares a
complete Resource Manifest snapshot first, then the repository commits the
version row, resource rows, and `skills.current_version_id` pointer with D1
`batch()` and SQL subqueries. Do not use Drizzle `transaction()` for this path;
D1 rejects the SQL `BEGIN`/`SAVEPOINT` statements emitted by that adapter.

### `storage.ts`

`storage.ts` handles object/blob storage only:

- Object key generation
- Put, get, delete, list
- Content type metadata
- Prefix cleanup

Rules:

- Object key format belongs in storage.
- Storage must not access D1.
- Storage must not construct HTTP responses.
- Storage must not parse business requests.

### `presenter.ts`

`presenter.ts` maps internal data to API response shapes:

- Service/repository results to shared schema responses
- URL/location construction
- Date serialization
- API DTO normalization

Rules:

- Presenters may use shared Zod schemas for parsing response shapes.
- Presenters must not access D1 or R2.
- Presenters must not contain business decisions.

### `errors.ts`

`errors.ts` defines module-level errors. Routes map these errors to HTTP responses.

```ts
export class EntityNotFoundError extends Error {}
export class DuplicateEntityError extends Error {}
export class InvalidEntityStateError extends Error {}
```

```ts
if (error instanceof EntityNotFoundError) {
  return c.json(apiError("Entity not found"), 404);
}
```

### `types.ts`

`types.ts` contains module-internal types:

- Service inputs and outputs
- Repository DTOs
- Storage DTOs
- Origin Adapter DTOs

Public API contracts belong in `shared/contract/*`.

## Dependency Rules

Preferred dependency direction:

```text
route -> service -> repository
route -> service -> storage
service -> presenter optional
route -> presenter optional
repository -> db
storage -> bindings
presenter -> shared schemas
```

Allowed cross-module dependency:

```text
modules/<module-a>/service.ts -> modules/<module-b>/service.ts
```

Avoid these dependencies:

```text
repository -> service
repository -> route
storage -> repository
presenter -> repository
module A repository -> module B repository
```

Cross-module access should go through service functions. This keeps business boundaries clear and prevents modules from coupling to each other's storage details.

## Naming Conventions

Use stable layer filenames:

```text
route.ts
service.ts
repository.ts
presenter.ts
storage.ts
errors.ts
types.ts
```

Use descriptive helper filenames for optional concerns:

```text
packager.ts
```

Name service functions after use cases:

```ts
createEntity();
deleteEntity();
readEntity();
listEntities();
```

Name repository functions after persistence operations:

```ts
findEntityById();
insertEntity();
updateEntity();
deleteEntityById();
```

Name storage functions after object operations:

```ts
putObject();
getObject();
deleteObjects();
getObjectKey();
```

## Code Placement Guide

```text
New API endpoint
  server/modules/<module>/route.ts

New business flow
  server/modules/<module>/service.ts

New DB table or field
  server/db/schema.ts
  migrations/*.sql
  server/modules/<module>/repository.ts

New object storage rule
  server/modules/<module>/storage.ts

New response field
  shared/contract/*.ts
  server/modules/<module>/presenter.ts

New Skill Origin adapter
  server/modules/origins/adapters/<origin>.ts
  server/modules/origins/service.ts

New packaging/building rule
  server/modules/<module>/packager.ts
```

## When to Split Code Out of Routes

Move code from `route.ts` into service/repository/storage/presenter when any of these appear:

- Drizzle queries
- R2 `put`, `get`, `list`, or `delete`
- Hashing workflows
- Object key generation
- Cross-table deletion or updates
- A handler grows beyond about 30 lines
- A business rule is reused by multiple endpoints
- A route file grows beyond about 150 lines

## Practical Guidance

Start each backend feature by choosing the module. Then choose the layer by responsibility:

- HTTP concern: `route.ts`
- Business concern: `service.ts`
- D1 concern: `repository.ts`
- R2/blob concern: `storage.ts`
- API shape concern: `presenter.ts`
- Module error: `errors.ts`
- Internal type: `types.ts`

Keep modules cohesive and keep infrastructure details behind the module layer that owns them.
