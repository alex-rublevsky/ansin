import type { Tx } from "@/db/tx";
import { products, type NewProduct, type Product } from "@/db/schema";

export async function insertProduct(
  input: NewProduct,
  tx: Tx,
): Promise<Product> {
  const [product] = await tx.insert(products).values(input).returning();
  return product;
}
