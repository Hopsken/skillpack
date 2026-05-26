import { relations } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const skillsTable = sqliteTable("skills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),

  currentVersionId: integer("current_version_id"),

  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const skillVersionsTable = sqliteTable(
  "skill_versions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    skillId: integer("skill_id").notNull(),
    versionNumber: integer("version_number").notNull(),

    changeSummary: text("change_summary"),
    description: text("description").notNull(),
    label: text("label"),

    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    skillVersionIndex: index("skill_versions_skill_idx").on(table.skillId),
    skillVersionUnique: uniqueIndex("skill_versions_skill_version_unique").on(
      table.skillId,
      table.versionNumber
    ),
  })
);

export const skillResourcesTable = sqliteTable(
  "skill_resources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    skillVersionId: integer("skill_version_id").notNull(),

    mediaType: text("media_type").notNull(),
    path: text("path").notNull(),
    sha256: text("sha256").notNull(),
    size: integer("size").notNull(),

    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    skillResourceShaIndex: index("skill_resources_sha_idx").on(table.sha256),
    skillResourceVersionIndex: index("skill_resources_version_idx").on(
      table.skillVersionId
    ),
    skillResourceVersionPathUnique: uniqueIndex(
      "skill_resources_version_path_unique"
    ).on(table.skillVersionId, table.path),
  })
);

export const skillOriginsTable = sqliteTable(
  "skill_origins",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    skillId: integer("skill_id").notNull(),

    kind: text("kind").notNull(),
    metadata: text("metadata", { mode: "json" }).$type<Record<
      string,
      unknown
    > | null>(),
    url: text("url").notNull(),

    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    skillOriginSkillIndex: index("skill_origins_skill_idx").on(table.skillId),
  })
);

export const skillsRelations = relations(skillsTable, ({ many, one }) => ({
  currentVersion: one(skillVersionsTable, {
    fields: [skillsTable.currentVersionId],
    references: [skillVersionsTable.id],
  }),
  origins: many(skillOriginsTable),
  versions: many(skillVersionsTable),
}));

export const skillVersionsRelations = relations(
  skillVersionsTable,
  ({ many, one }) => ({
    resources: many(skillResourcesTable),
    skill: one(skillsTable, {
      fields: [skillVersionsTable.skillId],
      references: [skillsTable.id],
    }),
  })
);

export const skillResourcesRelations = relations(
  skillResourcesTable,
  ({ one }) => ({
    version: one(skillVersionsTable, {
      fields: [skillResourcesTable.skillVersionId],
      references: [skillVersionsTable.id],
    }),
  })
);

export const skillOriginsRelations = relations(
  skillOriginsTable,
  ({ one }) => ({
    skill: one(skillsTable, {
      fields: [skillOriginsTable.skillId],
      references: [skillsTable.id],
    }),
  })
);
