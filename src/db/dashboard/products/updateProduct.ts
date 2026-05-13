import { eq } from "drizzle-orm";

import type { Tx } from "@/db/tx";
import { products, type NewProduct, type Product } from "@/db/schema";

export async function updateProduct(
  id: number,
  input: Partial<NewProduct>,
  tx: Tx,
): Promise<Product | undefined> {
  const [product] = await tx
    .update(products)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();

  return product;
}
