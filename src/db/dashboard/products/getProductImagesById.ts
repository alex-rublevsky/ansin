import { eq } from "drizzle-orm";

import { db } from "@/db";
import { products } from "@/db/schema";

export type ProductImages = {
  id: number;
  slug: string;
  images: string[] | null;
};

export async function getProductImagesById(
  id: number,
): Promise<ProductImages | undefined> {
  const [product] = await db
    .select({ id: products.id, slug: products.slug, images: products.images })
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  return product;
}
