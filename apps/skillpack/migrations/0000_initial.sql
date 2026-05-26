CREATE TABLE `skills` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE TABLE `skill_versions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `skill_id` integer NOT NULL,
  `version_number` integer NOT NULL,
  `name` text NOT NULL,
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
  `skill_id` integer NOT NULL,
  `kind` text NOT NULL,
  `url` text NOT NULL,
  `metadata` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX `skill_origins_skill_unique` ON `skill_origins` (`skill_id`);
