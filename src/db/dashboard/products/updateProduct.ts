import { eq, type InferSelectModel } from "drizzle-orm";
import { db } from "@/db/index";

import { products } from "@/db/schema";
import {
  replaceProductVariations,
  type VariationRow,
} from "@/db/dashboard/variations/replaceProductVariations";

export type UpdateProductInput = Pick<
  InferSelectModel<typeof products>,
  | "id"
  | "isActive"
  | "slug"
  | "name"
  | "categoryId"
  | "description"
  | "volume"
  | "cakeVolume"
  | "images"
> & {
  variations: VariationRow[];
};

export async function updateProduct(product: UpdateProductInput) {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(products)
      .set({
        isActive: product.isActive,
        slug: product.slug,
        name: product.name,
        categoryId: product.categoryId,
        description: product.description,
        volume: product.volume,
        cakeVolume: product.cakeVolume,
        images: product.images,
      })
      .where(eq(products.id, product.id))
      .returning();

    if (!updated) return updated;

    await replaceProductVariations(product.id, product.variations, tx);
    return updated;
  });
}
