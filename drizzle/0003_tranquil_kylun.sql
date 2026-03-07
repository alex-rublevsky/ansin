ALTER TABLE `sessions` ADD `created_at` integer DEFAULT (unixepoch()) NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `updated_at` integer DEFAULT (unixepoch()) NOT NULL;