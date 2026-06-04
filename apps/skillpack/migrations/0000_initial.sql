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
  `description` text NOT NULL,
  `license` text,
  `compatibility` text,
  `allowed_tools` text,
  `metadata` text,
  `origin` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX `skills_owner_name_unique` ON `skills` (`owner_user_id`, `name`);

CREATE TABLE `skill_resources` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `skill_id` integer NOT NULL,
  `path` text NOT NULL,
  `sha256` text NOT NULL,
  `media_type` text NOT NULL,
  `size` integer NOT NULL,
  `created_at` integer NOT NULL
);

CREATE INDEX `skill_resources_sha_idx` ON `skill_resources` (`sha256`);
CREATE INDEX `skill_resources_skill_idx` ON `skill_resources` (`skill_id`);
CREATE UNIQUE INDEX `skill_resources_skill_path_unique` ON `skill_resources` (`skill_id`, `path`);

CREATE TABLE `skill_snapshots` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `skill_id` integer NOT NULL,
  `snapshot_number` integer NOT NULL,
  `label` text,
  `note` text,
  `state_version` integer NOT NULL,
  `state_json` text NOT NULL,
  `created_at` integer NOT NULL
);

CREATE INDEX `skill_snapshots_skill_idx` ON `skill_snapshots` (`skill_id`);
CREATE UNIQUE INDEX `skill_snapshots_skill_number_unique` ON `skill_snapshots` (`skill_id`, `snapshot_number`);

