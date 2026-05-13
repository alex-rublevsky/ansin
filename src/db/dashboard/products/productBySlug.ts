import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  productVariations,
  products,
  type Product,
  type ProductVariation,
} from "@/db/schema";

export type DashboardProductDetail = {
  product: Product;
  variations: ProductVariation[];
};

export async function getDashboardProductBySlug(
  slug: string,
): Promise<DashboardProductDetail | undefined> {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (!product) return undefined;

  const variations = await db
    .select()
    .from(productVariations)
    .where(eq(productVariations.productId, product.id))
    .orderBy(asc(productVariations.weight));

  return { product, variations };
}
