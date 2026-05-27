import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createDb } from "@server/db/client";
import { skillOriginsTable, skillResourcesTable } from "@server/db/schema";
import { eq } from "drizzle-orm";
import { Miniflare } from "miniflare";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SkillRepository } from "./repository";
import type { StoredResourceObject } from "./types";

const splitSqlStatements = (sql: string) =>
  sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

const applyMigration = async (db: D1Database, path: string) => {
  const sql = await readFile(path, "utf-8");

  for (const statement of splitSqlStatements(sql)) {
    await db.prepare(statement).run();
  }
};

const resources = (suffix: string): StoredResourceObject[] => [
  {
    mediaType: "text/markdown; charset=utf-8",
    path: "SKILL.md",
    sha256: `skill-${suffix}`,
    size: 120,
  },
  {
    mediaType: "text/plain; charset=utf-8",
    path: "references/notes.txt",
    sha256: `notes-${suffix}`,
    size: 5,
  },
];

const versionInput = (
  skillId: number,
  suffix: string,
  input?: {
    changeSummary?: string;
    description?: string;
    resources?: StoredResourceObject[];
  }
) => ({
  changeSummary: input?.changeSummary,
  resources: input?.resources ?? resources(suffix),
  skillFileMetadata: {
    allowedTools: "Read",
    compatibility: "Requires git",
    description: input?.description ?? "First version",
    license: "Apache-2.0",
    metadata: { author: "acme" },
  },
  skillId,
});

const createSkill = async (
  repository: SkillRepository,
  input?: { name?: string }
) => {
  const result = await repository.createSkill(
    {
      name: input?.name ?? "demo",
      resources: resources(input?.name ?? "demo"),
      skillFileMetadata: {
        allowedTools: "Read",
        compatibility: "Requires git",
        description: "First version",
        license: "Apache-2.0",
        metadata: { author: "acme" },
      },
    },
    new Date("2026-05-25T12:00:00.000Z")
  );

  return result.skill;
};

describe("skill repository persistence", () => {
  let mf: Miniflare;
  let repository: SkillRepository;
  let db: ReturnType<typeof createDb>;

  beforeEach(async () => {
    mf = new Miniflare({
      d1Databases: { DB: "skillpack-test" },
      modules: true,
      script: "export default { fetch: () => new Response('ok') };",
    });

    const d1 = (await mf.getD1Database("DB")) as unknown as D1Database;
    await applyMigration(
      d1,
      join(process.cwd(), "migrations/0000_initial.sql")
    );

    db = createDb(d1);
    repository = new SkillRepository(db, "user-a");
  });

  afterEach(async () => {
    await mf.dispose();
  });

  it("creates a skill with the first version and resource manifest", async () => {
    const now = new Date("2026-05-25T12:00:00.000Z");

    const { version } = await repository.createSkill(
      { ...versionInput(0, "v1"), label: "initial", name: "demo" },
      now
    );

    const committedResources = await repository.listResourcesByVersionId(
      version.id
    );

    expect(version).toMatchObject({
      allowedTools: "Read",
      description: "First version",
      metadata: { author: "acme" },
      versionNumber: 1,
    });
    expect(committedResources).toHaveLength(2);
    expect(
      committedResources.map((resource) => resource.skillVersionId)
    ).toStrictEqual([version.id, version.id]);
  });

  it("allocates the next version number in D1 and derives latest version by max version number", async () => {
    const skill = await createSkill(repository);

    const nextVersion = await repository.commitSkillVersion(
      versionInput(skill.id, "v2", {
        description: "Second version",
      }),
      new Date("2026-05-25T12:01:00.000Z")
    );
    const latestVersion = await repository.findLatestSkillVersion(skill.id);

    expect(nextVersion.versionNumber).toBe(2);
    expect(nextVersion.description).toBe("Second version");
    expect(latestVersion?.id).toBe(nextVersion.id);
  });

  it("commits restored resource rows as a new current version", async () => {
    const skill = await createSkill(repository);
    const firstVersion = await repository.findLatestSkillVersion(skill.id);
    if (!firstVersion) {
      throw new Error("Expected first version");
    }
    const sourceRows = await repository.listResourcesByVersionId(
      firstVersion.id
    );
    const restoredResources = sourceRows.map((resource) => ({
      mediaType: resource.mediaType,
      path: resource.path,
      sha256: resource.sha256,
      size: resource.size,
    }));

    const restoredVersion = await repository.commitSkillVersion(
      versionInput(skill.id, "v1", {
        changeSummary: "Restore v1",
        resources: restoredResources,
      }),
      new Date("2026-05-25T12:02:00.000Z")
    );

    const restoredRows = await db
      .select()
      .from(skillResourcesTable)
      .where(eq(skillResourcesTable.skillVersionId, restoredVersion.id));

    expect(restoredVersion.versionNumber).toBe(2);
    expect(
      new Set(restoredRows.map((resource) => resource.sha256))
    ).toStrictEqual(new Set(sourceRows.map((resource) => resource.sha256)));
  });

  it("commits version-level origin provenance with the version snapshot", async () => {
    const now = new Date("2026-05-25T12:00:00.000Z");

    const { version } = await repository.createSkill(
      {
        ...versionInput(0, "v1"),
        name: "demo",
        origin: {
          kind: "github",
          metadata: { resolvedSkillPath: "skills/demo/SKILL.md" },
          url: "https://github.com/example/skills",
        },
      },
      now
    );

    const origins = await db
      .select()
      .from(skillOriginsTable)
      .where(eq(skillOriginsTable.skillVersionId, version.id));

    expect(origins).toHaveLength(1);
    expect(origins[0]).toMatchObject({
      kind: "github",
      metadata: { resolvedSkillPath: "skills/demo/SKILL.md" },
      skillVersionId: version.id,
      url: "https://github.com/example/skills",
    });
  });

  it("scopes unique skill names and list results to one owner", async () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const otherUserRepository = new SkillRepository(db, "user-b");
    const userSkill = await createSkill(repository, {
      name: "shared-name",
    });
    const otherUserSkill = await createSkill(otherUserRepository, {
      name: "shared-name",
    });
    await repository.commitSkillVersion(
      versionInput(userSkill.id, "user-a"),
      now
    );
    await repository.commitSkillVersion(
      versionInput(otherUserSkill.id, "user-b"),
      now
    );

    await expect(
      createSkill(repository, { name: "shared-name" })
    ).rejects.toMatchObject({ code: "duplicate-skill-name" });

    const userSkills = await repository.listSkills();

    expect(userSkills).toHaveLength(1);
    expect(userSkills[0]?.skill.id).toBe(userSkill.id);
    await expect(
      repository.findSkillById(otherUserSkill.id)
    ).resolves.toBeUndefined();
  });
});
