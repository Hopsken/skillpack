import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const skillsTable = sqliteTable(
  "skills",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    currentApprovedVersion: text("current_approved_version").notNull(),
    currentApprovedVersionId: integer("current_approved_version_id").notNull(),
    description: text("description").notNull(),
    handle: text("handle").notNull(),
    id: integer("id").primaryKey({ autoIncrement: true }),
    location: text("location").notNull(),
    name: text("name").notNull(),
    sourceType: text("source_type").notNull(),
    trustStatus: text("trust_status").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    sourceHandleUnique: uniqueIndex("skills_source_handle_unique").on(
      table.sourceType,
      table.handle
    ),
    sourceLocationUnique: uniqueIndex("skills_source_location_unique").on(
      table.sourceType,
      table.location
    ),
  })
);

export const skillVersionsTable = sqliteTable(
  "skill_versions",
  {
    approvedAt: integer("approved_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    entryPath: text("entry_path").notNull().default("SKILL.md"),
    id: integer("id").primaryKey({ autoIncrement: true }),
    location: text("location").notNull(),
    objectKey: text("object_key").notNull(),
    resolvedLocation: text("resolved_location").notNull(),
    sha256: text("sha256").notNull(),
    skillId: integer("skill_id")
      .notNull()
      .references(() => skillsTable.id),
    version: text("version").notNull(),
  },
  (table) => ({
    skillVersionIndex: index("skill_versions_skill_idx").on(table.skillId),
    skillVersionUnique: uniqueIndex("skill_versions_skill_version_unique").on(
      table.skillId,
      table.version
    ),
  })
);

export const skillResourcesTable = sqliteTable(
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
      .references(() => skillVersionsTable.id),
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
