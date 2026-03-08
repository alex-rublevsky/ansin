import type { InferSelectModel } from "drizzle-orm";
import type * as schema from "../db/schema";

// Product types
export type Product = InferSelectModel<typeof schema.products>;
export type Category = InferSelectModel<typeof schema.categories>;

// Extended product types
export interface ProductWithCategory extends Product {
	category?: Category | null;
}

// Cart types
export interface CartItem {
	productId: number;
	quantity: number;
	addedAt: number;
}

export interface Cart {
	items: CartItem[];
	lastUpdated: number;
}

export interface EnrichedCartItem extends CartItem {
	productName: string;
	productSlug: string;
	price: number;
	discount?: number | null;
	image?: string | null;
	attributes?: Record<string, string>;
	stock: number;
	unlimitedStock: boolean;
}

// Order types
export type Order = InferSelectModel<typeof schema.orders>;

export interface AddressInput {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	streetAddress: string;
	city: string;
	state: string;
	country: string;
	zipCode: string;
}

export interface CustomerInfo {
	shippingAddress: AddressInput;
	billingAddress?: AddressInput;
	notes?: string;
	shippingMethod?: string;
}

// Category types with counts
export interface CategoryWithCount extends Category {
	count?: number;
}

// Store data structure
export interface StoreData {
	products: Product[];
	categories: Category[];
}

// Stock validation result
export interface StockValidationResult {
	isAvailable: boolean;
	availableStock: number;
	unlimitedStock: boolean;
}
