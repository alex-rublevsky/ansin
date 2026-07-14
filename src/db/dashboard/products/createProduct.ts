import { db } from "@/db/index";
import type { InferSelectModel } from "drizzle-orm";

import { products } from "@/db/schema";
import {
  replaceProductVariations,
  type VariationRow,
} from "@/db/dashboard/variations/replaceProductVariations";

export type CreateProductInput = Pick<
  InferSelectModel<typeof products>,
  | "isActive"
  | "slug"
  | "name"
  | "description"
  | "categoryId"
  | "volume"
  | "cakeVolume"
  | "images"
> & {
  variations: VariationRow[];
};

export async function createProduct(product: CreateProductInput) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(products)
      .values({
        isActive: product.isActive ?? true,
        slug: product.slug,
        name: product.name,
        categoryId: product.categoryId,
        description: product.description,
        volume: product.volume,
        cakeVolume: product.cakeVolume,
        images: product.images,
      })
      .returning();

    await replaceProductVariations(created.id, product.variations, tx);
    return created;
  });
}
