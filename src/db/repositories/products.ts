import { and, count, desc, eq, like } from "drizzle-orm";
import { db } from "../client";
import { type NewProduct, type Product, products } from "../schema";

export async function getAllProducts(): Promise<Product[]> {
	return await db.select().from(products).orderBy(desc(products.createdAt));
}

export async function getProductBySlug(
	slug: string,
): Promise<Product | undefined> {
	const result = await db
		.select()
		.from(products)
		.where(eq(products.slug, slug))
		.limit(1);
	return result[0];
}

export async function getProductById(id: number): Promise<Product | undefined> {
	const result = await db
		.select()
		.from(products)
		.where(eq(products.id, id))
		.limit(1);
	return result[0];
}

export async function getProductsByCategory(
	categoryId: number,
): Promise<Product[]> {
	return await db
		.select()
		.from(products)
		.where(
			and(eq(products.categoryId, categoryId), eq(products.isActive, true)),
		)
		.orderBy(desc(products.createdAt));
}

export async function searchProducts(query: string): Promise<Product[]> {
	return await db
		.select()
		.from(products)
		.where(and(like(products.name, `%${query}%`), eq(products.isActive, true)))
		.orderBy(desc(products.createdAt));
}

export async function createProduct(product: NewProduct): Promise<Product> {
	const result = await db.insert(products).values(product).returning();
	return result[0];
}

export async function updateProduct(
	id: number,
	product: Partial<NewProduct>,
): Promise<Product | undefined> {
	const result = await db
		.update(products)
		.set({ ...product, updatedAt: new Date() })
		.where(eq(products.id, id))
		.returning();
	return result[0];
}

export async function deleteProduct(id: number): Promise<void> {
	await db.delete(products).where(eq(products.id, id));
}

export async function getProductCountByCategoryId(
	categoryId: number,
): Promise<number> {
	const result = await db
		.select({ count: count() })
		.from(products)
		.where(eq(products.categoryId, categoryId));
	return result[0].count;
}

export async function getActiveProducts(): Promise<Product[]> {
	return await db
		.select()
		.from(products)
		.where(eq(products.isActive, true))
		.orderBy(desc(products.createdAt));
}
