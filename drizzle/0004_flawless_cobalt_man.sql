CREATE TABLE `product_variations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`weight` integer NOT NULL,
	`price` real NOT NULL,
	`sku` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variations_sku_unique` ON `product_variations` (`sku`);--> statement-breakpoint
CREATE INDEX `idx_product_variations_product_id` ON `product_variations` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_product_variations_product_sort` ON `product_variations` (`product_id`,`sort`);--> statement-breakpoint
ALTER TABLE `products` ADD `price_up` integer DEFAULT true NOT NULL;