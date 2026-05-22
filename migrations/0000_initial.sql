CREATE TABLE `skills` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `source_type` text NOT NULL,
  `handle` text NOT NULL,
  `location` text NOT NULL,
  `name` text NOT NULL,
  `description` text NOT NULL,
  `current_approved_version_id` integer NOT NULL,
  `current_approved_version` text NOT NULL,
  `trust_status` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX `skills_source_handle_unique` ON `skills` (`source_type`, `handle`);
CREATE UNIQUE INDEX `skills_source_location_unique` ON `skills` (`source_type`, `location`);

CREATE TABLE `skill_versions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `skill_id` integer NOT NULL,
  `version` text NOT NULL,
  `location` text NOT NULL,
  `resolved_location` text NOT NULL,
  `entry_path` text DEFAULT 'SKILL.md' NOT NULL,
  `object_key` text NOT NULL,
  `sha256` text NOT NULL,
  `approved_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX `skill_versions_skill_idx` ON `skill_versions` (`skill_id`);
CREATE UNIQUE INDEX `skill_versions_skill_version_unique` ON `skill_versions` (`skill_id`, `version`);
