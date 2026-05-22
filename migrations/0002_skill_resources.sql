CREATE TABLE `skill_resources` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `skill_version_id` integer NOT NULL,
  `path` text NOT NULL,
  `object_key` text NOT NULL,
  `media_type` text NOT NULL,
  `sha256` text NOT NULL,
  `size` integer NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`skill_version_id`) REFERENCES `skill_versions`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX `skill_resources_version_idx` ON `skill_resources` (`skill_version_id`);
CREATE UNIQUE INDEX `skill_resources_version_path_unique` ON `skill_resources` (`skill_version_id`, `path`);
