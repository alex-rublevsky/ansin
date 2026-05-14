DROP INDEX `idx_product_variations_product_sort`;--> statement-breakpoint
CREATE INDEX `idx_product_variations_product_weight` ON `product_variations` (`product_id`,`weight`);--> statement-breakpoint
ALTER TABLE `product_variations` DROP COLUMN `sort`;