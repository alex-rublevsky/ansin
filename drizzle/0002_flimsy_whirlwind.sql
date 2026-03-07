ALTER TABLE `products` RENAME COLUMN "in_stock" TO "is_active";--> statement-breakpoint
ALTER TABLE `categories` ADD `is_active` integer DEFAULT true NOT NULL;