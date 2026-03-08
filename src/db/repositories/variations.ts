import { eq } from "drizzle-orm";
import { db } from "../client";
import {
	type NewProductVariation,
	type ProductVariation,
	productVariations,
} from "../schema";

export async function getVariationsByProductId(
	productId: number,
): Promise<ProductVariation[]> {
	return await db
		.select()
		.from(productVariations)
		.where(eq(productVariations.productId, productId))
		.orderBy(productVariations.sort);
}

export async function replaceVariationsForProduct(
	productId: number,
	variations: Omit<NewProductVariation, "productId">[],
): Promise<ProductVariation[]> {
	if (variations.length === 0) {
		await db
			.delete(productVariations)
			.where(eq(productVariations.productId, productId));
		return [];
	}

	const toInsert = variations.map((v, i) => ({
		...v,
		productId,
		sort: v.sort ?? i,
	}));

	return await db.transaction(async (tx) => {
		await tx
			.delete(productVariations)
			.where(eq(productVariations.productId, productId));
		return await tx.insert(productVariations).values(toInsert).returning();
	});
}
