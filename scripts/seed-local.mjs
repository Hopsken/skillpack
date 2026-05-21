const apiUrl = process.env.SKILLPACK_DEV_URL ?? "http://localhost:5173";

const skills = [
  {
    name: "api-skill-demo",
    description: "Demo API-backed skill for validating the local registry flow.",
    version: "0.1.0",
    content: `# Demo Skill

Use this skill when validating API-backed skills in local development.

## Workflow

1. Load the catalog from the API.
2. Read this skill through the API.
3. Confirm the content is served from R2-backed storage.
`
  },
  {
    name: "cloudflare-worker-review",
    description: "Review Cloudflare Worker code for bindings, routing, and deployment readiness.",
    version: "0.1.0",
    content: `# Cloudflare Worker Review

Use this skill when reviewing a Cloudflare Worker before local testing or deploy.

## Checklist

- Confirm bindings are declared in wrangler config.
- Confirm API routes use the expected prefix.
- Confirm static asset routing keeps API requests on the Worker.
- Run typecheck and build before deploy.
`
  },
  {
    name: "frontend-structure-check",
    description: "Check frontend files against the pages, features, domain, components, and shared structure.",
    version: "0.1.0",
    content: `# Frontend Structure Check

Use this skill when adding or moving frontend files.

## Rules

- Put route entries in pages.
- Put workflows and API hooks in features.
- Put pure business logic in domain.
- Put reusable business UI in components.
- Put generic infrastructure in shared.
`
  },
  {
    name: "skill-authoring-guide",
    description: "Draft concise Agent Skills with clear triggers, workflows, and references.",
    version: "0.1.0",
    content: `# Skill Authoring Guide

Use this skill when writing a new Agent Skill.

## Structure

- Describe when the skill should be used.
- Keep the operational workflow explicit.
- Link references for detailed guidance.
- Keep examples close to the decisions they support.
`
  },
  {
    name: "api-debugging-helper",
    description: "Debug local Hono API behavior from request shape to response validation.",
    version: "0.1.0",
    content: `# API Debugging Helper

Use this skill when a local API endpoint behaves unexpectedly.

## Steps

1. Reproduce with curl.
2. Check request method, path, and content type.
3. Validate response shape against shared schemas.
4. Inspect storage reads and writes.
`
  }
];

async function createSkill(skill) {
  const response = await fetch(`${apiUrl}/api/v1/skills`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(skill)
  });

  if (response.status === 201) {
    console.log(`created ${skill.name}`);
    return;
  }

  if (response.status === 409) {
    console.log(`skipped ${skill.name} (already exists)`);
    return;
  }

  const body = await response.text();
  throw new Error(`Failed to seed ${skill.name}: ${response.status} ${body}`);
}

async function main() {
  console.log(`seeding local Skillpack API at ${apiUrl}`);

  for (const skill of skills) {
    await createSkill(skill);
  }

  console.log("done");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  console.error("Start the local dev server with `pnpm dev`, then run `pnpm db:seed:local`.");
  process.exitCode = 1;
});
