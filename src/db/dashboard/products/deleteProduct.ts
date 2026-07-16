import { eq } from "drizzle-orm";

import { db } from "@/db";
import { products } from "@/db/schema";
import { deleteObjects } from "@/lib/storage";

export type DeletedProduct = {
  id: number;
  slug: string;
  name: string;
};

export async function deleteProduct(id: number): Promise<DeletedProduct> {
  return db.transaction(async (tx) => {
    const [product] = await tx
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        images: products.images,
      })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product) {
      throw new Error("Product not found");
    }

    await tx.delete(products).where(eq(products.id, id));

    if (product.images && product.images.length > 0) {
      await deleteObjects(product.images);
    }

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
    };
  });
}
