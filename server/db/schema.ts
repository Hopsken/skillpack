import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const skills = sqliteTable(
  "skills",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    description: text("description").notNull(),
    id: integer("id").primaryKey({ autoIncrement: true }),
    latestVersion: text("latest_version").notNull(),
    name: text("name").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    nameIndex: index("skills_name_idx").on(table.name),
  })
);

export const skillVersions = sqliteTable(
  "skill_versions",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    entryPath: text("entry_path").notNull().default("SKILL.md"),
    id: integer("id").primaryKey({ autoIncrement: true }),
    objectKey: text("object_key").notNull(),
    sha256: text("sha256").notNull(),
    skillId: integer("skill_id")
      .notNull()
      .references(() => skills.id),
    version: text("version").notNull(),
  },
  (table) => ({
    skillVersionUnique: uniqueIndex(
      "skill_versions_skill_id_version_unique"
    ).on(table.skillId, table.version),
  })
);

export const skillResources = sqliteTable(
  "skill_resources",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    id: integer("id").primaryKey({ autoIncrement: true }),
    mediaType: text("media_type").notNull(),
    objectKey: text("object_key").notNull(),
    path: text("path").notNull(),
    sha256: text("sha256").notNull(),
    size: integer("size").notNull(),
    skillVersionId: integer("skill_version_id")
      .notNull()
      .references(() => skillVersions.id),
  },
  (table) => ({
    skillResourceVersionIndex: index("skill_resources_version_idx").on(
      table.skillVersionId
    ),
    skillResourceVersionPathUnique: uniqueIndex(
      "skill_resources_version_path_unique"
    ).on(table.skillVersionId, table.path),
  })
);
