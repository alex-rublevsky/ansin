import { and, desc, gt, inArray } from "drizzle-orm";

import { db } from "@/db";
import { productVariations, type ProductVariation } from "@/db/schema";

export type ProductCardVariation = Pick<
  ProductVariation,
  "id" | "weight" | "price" | "sku"
>;

export async function getVariationsGroupedByProductId(
  productIds: number[],
): Promise<Map<number, ProductCardVariation[]>> {
  if (productIds.length === 0) return new Map();

  const rows = await db
    .select({
      productId: productVariations.productId,
      id: productVariations.id,
      weight: productVariations.weight,
      price: productVariations.price,
      sku: productVariations.sku,
    })
    .from(productVariations)
    .where(
      and(
        inArray(productVariations.productId, productIds),
        gt(productVariations.weight, 0),
      ),
    )
    .orderBy(desc(productVariations.weight), desc(productVariations.id));

  const map = new Map<number, ProductCardVariation[]>();
  for (const { productId, ...variation } of rows) {
    const list = map.get(productId) ?? [];
    list.push(variation);
    map.set(productId, list);
  }
  return map;
}
