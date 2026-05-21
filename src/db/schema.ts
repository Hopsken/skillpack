import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const skills = sqliteTable("skills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  latestVersion: text("latest_version").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull()
});

export const skillVersions = sqliteTable(
  "skill_versions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    skillId: integer("skill_id").notNull().references(() => skills.id),
    version: text("version").notNull(),
    entryPath: text("entry_path").notNull().default("SKILL.md"),
    objectKey: text("object_key").notNull(),
    sha256: text("sha256").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull()
  },
  (table) => ({
    skillVersionUnique: uniqueIndex("skill_versions_skill_id_version_unique").on(
      table.skillId,
      table.version
    )
  })
);
