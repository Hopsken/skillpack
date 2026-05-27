import { relations } from "drizzle-orm";
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
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    ownerUserId: text("owner_user_id").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    skillOwnerNameUnique: uniqueIndex("skills_owner_name_unique").on(
      table.ownerUserId,
      table.name
    ),
  })
);

export const skillVersionsTable = sqliteTable(
  "skill_versions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    skillId: integer("skill_id").notNull(),
    versionNumber: integer("version_number").notNull(),

    allowedTools: text("allowed_tools"),
    changeSummary: text("change_summary"),
    compatibility: text("compatibility"),
    description: text("description").notNull(),
    label: text("label"),
    license: text("license"),
    metadata: text("metadata", { mode: "json" }).$type<Record<
      string,
      string
    > | null>(),

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
    skillVersionId: integer("skill_version_id").notNull(),

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
    skillOriginVersionUnique: uniqueIndex("skill_origins_version_unique").on(
      table.skillVersionId
    ),
  })
);

export const skillsRelations = relations(skillsTable, ({ many }) => ({
  versions: many(skillVersionsTable),
}));

export const skillVersionsRelations = relations(
  skillVersionsTable,
  ({ many, one }) => ({
    origins: many(skillOriginsTable),
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
    version: one(skillVersionsTable, {
      fields: [skillOriginsTable.skillVersionId],
      references: [skillVersionsTable.id],
    }),
  })
);
