import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { categories, products } from "@/db/schema";
import {
  getVariationsGroupedByProductId,
  type ProductCardVariation,
} from "./variations";

export type FeedVariation = ProductCardVariation;

export type FeedProduct = {
  id: number;
  slug: string;
  name: string;
  volume: number;
  cakeVolume: number;
  categorySlug: string | null;
  first_image: string | null;
  second_image: string | null;
  variations: FeedVariation[];
  isOutOfStock: boolean;
};

export async function getAllStorefrontProducts(): Promise<FeedProduct[]> {
  const list = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      volume: products.volume,
      cakeVolume: products.cakeVolume,
      images: products.images,
      categorySlug: categories.slug,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.isActive, true))
    .orderBy(desc(products.createdAt));

  const byProduct = await getVariationsGroupedByProductId(
    list.map((p) => p.id),
  );

  return list
    .map((p) => {
      const images = Array.isArray(p.images) ? p.images : [];
      const variations = byProduct.get(p.id) ?? [];
      const hasAvailableStock =
        p.volume > 0 &&
        variations.some(
          (variation) => variation.weight > 0 && variation.weight <= p.volume,
        );

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        volume: p.volume,
        cakeVolume: p.cakeVolume,
        categorySlug: p.categorySlug ?? null,
        first_image: images[0] ?? null,
        second_image: images[1] ?? null,
        variations,
        isOutOfStock: !hasAvailableStock,
      };
    })
    .sort((a, b) => Number(a.isOutOfStock) - Number(b.isOutOfStock));
}
