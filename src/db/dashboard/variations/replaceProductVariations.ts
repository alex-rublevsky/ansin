import { eq } from "drizzle-orm";

import type { Tx } from "@/db/tx";
import {
  productVariations,
  type NewProductVariation,
  type ProductVariation,
} from "@/db/schema";

export type VariationRow = {
  weight: number;
  price: number;
  sku: string;
};

/** Full replace in one transaction: delete existing, bulk-insert the new set. */
export async function replaceProductVariations(
  productId: number,
  variations: VariationRow[],
  tx: Tx,
): Promise<ProductVariation[]> {
  await tx
    .delete(productVariations)
    .where(eq(productVariations.productId, productId));

  if (variations.length === 0) return [];

  const rows: NewProductVariation[] = variations.map((v) => ({
    productId,
    weight: v.weight,
    price: v.price,
    sku: v.sku,
  }));

  return tx.insert(productVariations).values(rows).returning();
}
