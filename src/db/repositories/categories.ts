import { asc, eq } from "drizzle-orm";
import { db } from "../client";
import { type Category, categories, type NewCategory } from "../schema";

export async function getAllCategories(): Promise<Category[]> {
	return await db
		.select()
		.from(categories)
		.orderBy(asc(categories.displayOrder));
}

export async function getActiveCategories(): Promise<Category[]> {
	return await db
		.select()
		.from(categories)
		.where(eq(categories.isActive, true))
		.orderBy(asc(categories.displayOrder));
}

export async function getCategoryBySlug(
	slug: string,
): Promise<Category | undefined> {
	const result = await db
		.select()
		.from(categories)
		.where(eq(categories.slug, slug))
		.limit(1);
	return result[0];
}

export async function getCategoryById(
	id: number,
): Promise<Category | undefined> {
	const result = await db
		.select()
		.from(categories)
		.where(eq(categories.id, id))
		.limit(1);
	return result[0];
}

export async function createCategory(category: NewCategory): Promise<Category> {
	const result = await db.insert(categories).values(category).returning();
	return result[0];
}

export async function updateCategory(
	id: number,
	category: Partial<NewCategory>,
): Promise<Category | undefined> {
	const result = await db
		.update(categories)
		.set(category)
		.where(eq(categories.id, id))
		.returning();
	return result[0];
}

export async function deleteCategory(id: number): Promise<void> {
	await db.delete(categories).where(eq(categories.id, id));
}
