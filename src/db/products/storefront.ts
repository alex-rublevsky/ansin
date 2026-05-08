import { asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  productVariations,
  products,
  type ProductVariation,
} from "@/db/schema";

export type FeedVariation = Pick<
  ProductVariation,
  "id" | "weight" | "price" | "sku" | "sort"
>;

export type FeedProduct = {
  id: number;
  slug: string;
  name: string;
  price: number;
  categorySlug: string | null;
  first_image: string | null;
  second_image: string | null;
  variations: FeedVariation[];
};

async function getVariationsGroupedByProductId(
  productIds: number[],
): Promise<Map<number, FeedVariation[]>> {
  if (productIds.length === 0) return new Map();

  const rows = await db
    .select({
      productId: productVariations.productId,
      id: productVariations.id,
      weight: productVariations.weight,
      price: productVariations.price,
      sku: productVariations.sku,
      sort: productVariations.sort,
    })
    .from(productVariations)
    .where(inArray(productVariations.productId, productIds))
    .orderBy(asc(productVariations.productId), asc(productVariations.sort));

  const map = new Map<number, FeedVariation[]>();
  for (const { productId, ...variation } of rows) {
    const list = map.get(productId) ?? [];
    list.push(variation);
    map.set(productId, list);
  }
  return map;
}

export async function getFeedProducts(): Promise<FeedProduct[]> {
  const list = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      price: products.price,
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

  return list.map((p) => {
    const images = Array.isArray(p.images) ? p.images : [];
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price,
      categorySlug: p.categorySlug ?? null,
      first_image: images[0] ?? null,
      second_image: images[1] ?? null,
      variations: byProduct.get(p.id) ?? [],
    };
  });
}

export type StorefrontProduct = {
  slug: string;
  name: string;
  price: number;
  description: string;
  images: string[];
};

export async function getProductsForSlugPages(): Promise<StorefrontProduct[]> {
  const rows = await db
    .select({
      slug: products.slug,
      name: products.name,
      price: products.price,
      description: products.description,
      images: products.images,
    })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(desc(products.createdAt));

  return rows.map((p) => ({
    ...p,
    images: Array.isArray(p.images) ? p.images : [],
  }));
}
