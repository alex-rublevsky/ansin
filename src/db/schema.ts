import { sql } from "drizzle-orm";
import {
	index,
	integer,
	real,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	description: text("description").notNull(),
	price: real("price").notNull(),
	slug: text("slug").notNull().unique(),
	categoryId: integer("category_id").references(() => categories.id),
	volume: integer("volume").notNull().default(0),
	images: text("images", { mode: "json" }).$type<string[]>().default(sql`'[]'`),
	priceUp: integer("price_up", {
		mode: "boolean",
	})
		.notNull()
		.default(true),
	isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export const productVariations = sqliteTable(
	"product_variations",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		productId: integer("product_id")
			.notNull()
			.references(() => products.id, { onDelete: "cascade" }),
		weight: integer("weight").notNull(),
		price: real("price").notNull(),
		sku: text("sku").notNull().unique(),
		sort: integer("sort").notNull().default(0),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(table) => [
		index("idx_product_variations_product_id").on(table.productId),
		index("idx_product_variations_product_sort").on(
			table.productId,
			table.sort,
		),
	],
);

export const categories = sqliteTable("categories", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	description: text("description"),
	displayOrder: integer("display_order").notNull().default(0),
	isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const orders = sqliteTable("orders", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	orderNumber: text("order_number").notNull().unique(),
	customerName: text("customer_name").notNull(),
	customerEmail: text("customer_email").notNull(),
	customerPhone: text("customer_phone"),
	items: text("items", { mode: "json" })
		.$type<
			Array<{
				productId: number;
				productName: string;
				quantity: number;
				price: number;
			}>
		>()
		.notNull(),
	totalAmount: real("total_amount").notNull(),
	status: text("status", { enum: ["pending", "confirmed", "cancelled"] })
		.notNull()
		.default("pending"),
	notes: text("notes"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export const users = sqliteTable("users", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("email_verified", { mode: "boolean" })
		.notNull()
		.default(false),
	image: text("image"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export const sessions = sqliteTable("sessions", {
	id: text("id").primaryKey(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	token: text("token").notNull().unique(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
});

export const accounts = sqliteTable("accounts", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: integer("access_token_expires_at", {
		mode: "timestamp",
	}),
	refreshTokenExpiresAt: integer("refresh_token_expires_at", {
		mode: "timestamp",
	}),
	scope: text("scope"),
	password: text("password"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export const verifications = sqliteTable("verifications", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }),
	updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const deploymentChanges = sqliteTable("deployment_changes", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	entityType: text("entity_type", {
		enum: ["product", "category"],
	}).notNull(),
	entitySlug: text("entity_slug").notNull(),
	action: text("action", {
		enum: ["create", "update", "delete"],
	}).notNull(),
	description: text("description").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export const deployments = sqliteTable("deployments", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	source: text("source", {
		enum: ["dashboard", "local", "ci"],
	}).notNull(),
	status: text("status", {
		enum: ["pending", "building", "completed", "failed"],
	})
		.notNull()
		.default("pending"),
	changesCount: integer("changes_count").notNull().default(0),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	completedAt: integer("completed_at", { mode: "timestamp" }),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductVariation = typeof productVariations.$inferSelect;
export type NewProductVariation = typeof productVariations.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type DeploymentChange = typeof deploymentChanges.$inferSelect;
export type NewDeploymentChange = typeof deploymentChanges.$inferInsert;
export type Deployment = typeof deployments.$inferSelect;
export type NewDeployment = typeof deployments.$inferInsert;
