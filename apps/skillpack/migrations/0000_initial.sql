CREATE TABLE "user" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "emailVerified" INTEGER NOT NULL DEFAULT 0,
  "image" TEXT,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL
);

CREATE UNIQUE INDEX "user_email_idx" ON "user" ("email");

CREATE TABLE "session" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "expiresAt" INTEGER NOT NULL,
  "token" TEXT NOT NULL,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "session_token_idx" ON "session" ("token");
CREATE INDEX "session_user_id_idx" ON "session" ("userId");

CREATE TABLE "account" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" INTEGER,
  "refreshTokenExpiresAt" INTEGER,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL
);

CREATE INDEX "account_user_id_idx" ON "account" ("userId");
CREATE UNIQUE INDEX "account_provider_account_idx" ON "account" ("providerId", "accountId");

CREATE TABLE "verification" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" INTEGER NOT NULL,
  "createdAt" INTEGER,
  "updatedAt" INTEGER
);

CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");

CREATE TABLE `skills` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `owner_user_id` text NOT NULL,
  `name` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX `skills_owner_name_unique` ON `skills` (`owner_user_id`, `name`);

CREATE TABLE `skill_versions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `skill_id` integer NOT NULL,
  `version_number` integer NOT NULL,
  `description` text NOT NULL,
  `license` text,
  `compatibility` text,
  `allowed_tools` text,
  `metadata` text,
  `label` text,
  `change_summary` text,
  `created_at` integer NOT NULL
);

CREATE INDEX `skill_versions_skill_idx` ON `skill_versions` (`skill_id`);
CREATE UNIQUE INDEX `skill_versions_skill_version_unique` ON `skill_versions` (`skill_id`, `version_number`);

CREATE TABLE `skill_resources` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `skill_version_id` integer NOT NULL,
  `path` text NOT NULL,
  `sha256` text NOT NULL,
  `media_type` text NOT NULL,
  `size` integer NOT NULL,
  `created_at` integer NOT NULL
);

CREATE INDEX `skill_resources_sha_idx` ON `skill_resources` (`sha256`);
CREATE INDEX `skill_resources_version_idx` ON `skill_resources` (`skill_version_id`);
CREATE UNIQUE INDEX `skill_resources_version_path_unique` ON `skill_resources` (`skill_version_id`, `path`);

CREATE TABLE `skill_origins` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `skill_version_id` integer NOT NULL,
  `kind` text NOT NULL,
  `url` text NOT NULL,
  `metadata` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX `skill_origins_version_unique` ON `skill_origins` (`skill_version_id`);
