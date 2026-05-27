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

export const jwksTable = sqliteTable("jwks", {
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }),
  id: text("id").primaryKey().notNull(),
  privateKey: text("privateKey").notNull(),
  publicKey: text("publicKey").notNull(),
});

export const oauthClientTable = sqliteTable(
  "oauthClient",
  {
    clientId: text("clientId").notNull(),
    clientSecret: text("clientSecret"),
    contacts: text("contacts", { mode: "json" }).$type<string[] | null>(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }),
    disabled: integer("disabled", { mode: "boolean" }),
    enableEndSession: integer("enableEndSession", { mode: "boolean" }),
    grantTypes: text("grantTypes", { mode: "json" }).$type<string[] | null>(),
    icon: text("icon"),
    id: text("id").primaryKey().notNull(),
    metadata: text("metadata", { mode: "json" }).$type<Record<
      string,
      unknown
    > | null>(),
    name: text("name"),
    policy: text("policy"),
    postLogoutRedirectUris: text("postLogoutRedirectUris", {
      mode: "json",
    }).$type<string[] | null>(),
    public: integer("public", { mode: "boolean" }),
    redirectUris: text("redirectUris", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    referenceId: text("referenceId"),
    requirePKCE: integer("requirePKCE", { mode: "boolean" }),
    responseTypes: text("responseTypes", { mode: "json" }).$type<
      string[] | null
    >(),
    scopes: text("scopes", { mode: "json" }).$type<string[] | null>(),
    skipConsent: integer("skipConsent", { mode: "boolean" }),
    softwareId: text("softwareId"),
    softwareStatement: text("softwareStatement"),
    softwareVersion: text("softwareVersion"),
    subjectType: text("subjectType"),
    tokenEndpointAuthMethod: text("tokenEndpointAuthMethod"),
    tos: text("tos"),
    type: text("type"),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }),
    uri: text("uri"),
    userId: text("userId"),
  },
  (table) => ({
    oauthClientClientIdUnique: uniqueIndex("oauthClient_clientId_unique").on(
      table.clientId
    ),
    oauthClientUserIdIndex: index("oauthClient_userId_idx").on(table.userId),
  })
);

export const oauthRefreshTokenTable = sqliteTable(
  "oauthRefreshToken",
  {
    authTime: integer("authTime", { mode: "timestamp_ms" }),
    clientId: text("clientId").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }),
    expiresAt: integer("expiresAt", { mode: "timestamp_ms" }),
    id: text("id").primaryKey().notNull(),
    referenceId: text("referenceId"),
    revoked: integer("revoked", { mode: "timestamp_ms" }),
    scopes: text("scopes", { mode: "json" }).$type<string[]>().notNull(),
    sessionId: text("sessionId"),
    token: text("token").notNull(),
    userId: text("userId").notNull(),
  },
  (table) => ({
    oauthRefreshTokenClientIdIndex: index("oauthRefreshToken_clientId_idx").on(
      table.clientId
    ),
    oauthRefreshTokenSessionIdIndex: index(
      "oauthRefreshToken_sessionId_idx"
    ).on(table.sessionId),
    oauthRefreshTokenTokenUnique: uniqueIndex(
      "oauthRefreshToken_token_unique"
    ).on(table.token),
    oauthRefreshTokenUserIdIndex: index("oauthRefreshToken_userId_idx").on(
      table.userId
    ),
  })
);

export const oauthAccessTokenTable = sqliteTable(
  "oauthAccessToken",
  {
    clientId: text("clientId").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }),
    expiresAt: integer("expiresAt", { mode: "timestamp_ms" }),
    id: text("id").primaryKey().notNull(),
    referenceId: text("referenceId"),
    refreshId: text("refreshId"),
    scopes: text("scopes", { mode: "json" }).$type<string[]>().notNull(),
    sessionId: text("sessionId"),
    token: text("token"),
    userId: text("userId"),
  },
  (table) => ({
    oauthAccessTokenClientIdIndex: index("oauthAccessToken_clientId_idx").on(
      table.clientId
    ),
    oauthAccessTokenRefreshIdIndex: index("oauthAccessToken_refreshId_idx").on(
      table.refreshId
    ),
    oauthAccessTokenSessionIdIndex: index("oauthAccessToken_sessionId_idx").on(
      table.sessionId
    ),
    oauthAccessTokenTokenUnique: uniqueIndex(
      "oauthAccessToken_token_unique"
    ).on(table.token),
    oauthAccessTokenUserIdIndex: index("oauthAccessToken_userId_idx").on(
      table.userId
    ),
  })
);

export const oauthConsentTable = sqliteTable(
  "oauthConsent",
  {
    clientId: text("clientId").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }),
    id: text("id").primaryKey().notNull(),
    referenceId: text("referenceId"),
    scopes: text("scopes", { mode: "json" }).$type<string[]>().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }),
    userId: text("userId"),
  },
  (table) => ({
    oauthConsentClientIdIndex: index("oauthConsent_clientId_idx").on(
      table.clientId
    ),
    oauthConsentUserIdIndex: index("oauthConsent_userId_idx").on(table.userId),
  })
);
