import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createDb } from "@server/db/client";
import { skillResourcesTable, skillsTable } from "@server/db/schema";
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
    size: 12,
  },
  {
    mediaType: "text/plain; charset=utf-8",
    path: "references/notes.txt",
    sha256: `notes-${suffix}`,
    size: 5,
  },
];

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

  it("commits the first version, resources, and current pointer atomically", async () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const skill = await repository.insertSkill("demo", now);

    const version = await repository.commitSkillVersion(
      {
        description: "First version",
        label: "initial",
        resources: resources("v1"),
        skillId: skill.id,
      },
      now
    );

    const [updatedSkill] = await db
      .select()
      .from(skillsTable)
      .where(eq(skillsTable.id, skill.id));
    const committedResources = await repository.listResourcesByVersionId(
      version.id
    );

    expect(version.versionNumber).toBe(1);
    expect(updatedSkill?.currentVersionId).toBe(version.id);
    expect(committedResources).toHaveLength(2);
    expect(
      committedResources.map((resource) => resource.skillVersionId)
    ).toStrictEqual([version.id, version.id]);
  });

  it("allocates the next version number in D1 and can update the skill name", async () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const skill = await repository.insertSkill("demo", now);
    await repository.commitSkillVersion(
      {
        description: "First version",
        resources: resources("v1"),
        skillId: skill.id,
      },
      now
    );

    const nextVersion = await repository.commitSkillVersion(
      {
        description: "Second version",
        name: "renamed demo",
        resources: resources("v2"),
        skillId: skill.id,
      },
      new Date("2026-05-25T12:01:00.000Z")
    );

    const [updatedSkill] = await db
      .select()
      .from(skillsTable)
      .where(eq(skillsTable.id, skill.id));

    expect(nextVersion.versionNumber).toBe(2);
    expect(updatedSkill?.currentVersionId).toBe(nextVersion.id);
    expect(updatedSkill?.name).toBe("renamed demo");
  });

  it("commits restored resource rows as a new current version", async () => {
    const now = new Date("2026-05-25T12:00:00.000Z");
    const skill = await repository.insertSkill("demo", now);
    const firstVersion = await repository.commitSkillVersion(
      {
        description: "First version",
        resources: resources("v1"),
        skillId: skill.id,
      },
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
      {
        changeSummary: "Restore v1",
        description: "First version",
        resources: restoredResources,
        skillId: skill.id,
      },
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
