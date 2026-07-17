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
  description: text("description"),
  //price: real("price").notNull(),
  slug: text("slug").notNull().unique(),
  categoryId: integer("category_id")
    .references(() => categories.id)
    .notNull(),
  volume: integer("volume").notNull().default(0),
  cakeVolume: integer("cake_volume").notNull().default(0),
  images: text("images", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  // createdAt: integer("created_at", { mode: "timestamp" })
  //   .notNull()
  //   .default(sql`(unixepoch())`),
  // updatedAt: integer("updated_at", { mode: "timestamp" })
  //   .notNull()
  //   .default(sql`(unixepoch())`),
});

export const productVariations = sqliteTable(
  "product_variations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    weight: integer("weight").notNull().default(0),
    price: real("price").notNull(),
    sku: text("sku").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("idx_product_variations_product_id").on(table.productId),
    index("idx_product_variations_product_weight").on(
      table.productId,
      table.weight,
    ),
  ],
);

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  //TODO: remove this column, categories will based on whether they are empty or not
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

/** Snapshot of a cart line at checkout — keep display fields even if the product changes later. */
export type OrderItem = {
  productId: number;
  variationId: number;
  productName: string;
  slug: string;
  image: string;
  categoryName?: string;
  variationWeight: number;
  quantity: number;
  price: number;
};

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  items: text("items", { mode: "json" })
    .$type<OrderItem[]>()
    .notNull(),
  totalAmount: real("total_amount").notNull(),
  status: text("status", { enum: ["pending", "confirmed", "cancelled"] })
    .notNull()
    .default("pending"),
  paymentMethod: text("payment_method", { enum: ["cash", "card"] }),
  deliveryMethod: text("delivery_method", { enum: ["pickup", "delivery"] }),
  contactMethod: text("contact_method", {
    enum: ["telegram", "whatsapp", "instagram", "phone", "email"],
  }),
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

export const schema = {
  users,
  sessions,
  accounts,
  verifications,
  products,
  // productVariations,
  // productAttributes,
  // attributeValues,
  // productAttributeValues,
  // variationAttributeValues,
  categories,
  // storeLocations,
  // productStoreLocations,
  // news,
};

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductVariation = typeof productVariations.$inferSelect;
export type NewProductVariation = typeof productVariations.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
