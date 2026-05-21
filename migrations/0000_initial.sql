CREATE TABLE `skills` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `description` text NOT NULL,
  `latest_version` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE INDEX `skills_name_idx` ON `skills` (`name`);

CREATE TABLE `skill_versions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `skill_id` integer NOT NULL,
  `version` text NOT NULL,
  `entry_path` text DEFAULT 'SKILL.md' NOT NULL,
  `object_key` text NOT NULL,
  `sha256` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX `skill_versions_skill_id_version_unique` ON `skill_versions` (`skill_id`, `version`);
