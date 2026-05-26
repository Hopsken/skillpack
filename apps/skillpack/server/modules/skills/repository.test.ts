import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createDb } from "@server/db/client";
import { skillResourcesTable } from "@server/db/schema";
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
    name?: string;
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
    name: input?.name ?? "demo",
  },
  skillId,
});

describe("SkillRepository.commitSkillVersion", () => {
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
    repository = new SkillRepository(db);
  });

  afterEach(async () => {
    await mf.dispose();
  });

  it("commits the first version, resource manifest, and skill metadata projection", async () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const skill = await repository.insertSkill(now);

    const version = await repository.commitSkillVersion(
      { ...versionInput(skill.id, "v1"), label: "initial" },
      now
    );

    const committedResources = await repository.listResourcesByVersionId(
      version.id
    );

    expect(version).toMatchObject({
      allowedTools: "Read",
      description: "First version",
      metadata: { author: "acme" },
      name: "demo",
      versionNumber: 1,
    });
    expect(committedResources).toHaveLength(2);
    expect(
      committedResources.map((resource) => resource.skillVersionId)
    ).toStrictEqual([version.id, version.id]);
  });

  it("allocates the next version number in D1 and derives latest version by max version number", async () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const skill = await repository.insertSkill(now);
    await repository.commitSkillVersion(versionInput(skill.id, "v1"), now);

    const nextVersion = await repository.commitSkillVersion(
      versionInput(skill.id, "v2", {
        description: "Second version",
        name: "renamed-demo",
      }),
      new Date("2026-05-25T12:01:00.000Z")
    );
    const latestVersion = await repository.findLatestSkillVersion(skill.id);

    expect(nextVersion.versionNumber).toBe(2);
    expect(nextVersion.name).toBe("renamed-demo");
    expect(latestVersion?.id).toBe(nextVersion.id);
  });

  it("commits restored resource rows as a new current version", async () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const skill = await repository.insertSkill(now);
    const firstVersion = await repository.commitSkillVersion(
      versionInput(skill.id, "v1"),
      now
    );
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
});
