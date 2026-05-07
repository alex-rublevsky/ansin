import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  productVariations,
  products,
  type Product,
  type ProductVariation,
} from "@/db/schema";

export type DashboardFeedProduct = {
  id: number;
  slug: string;
  name: string;
  price: number;
  isActive: boolean;
  first_image: string | null;
  second_image: string | null;
};

export async function getDashboardProducts(): Promise<DashboardFeedProduct[]> {
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      price: products.price,
      isActive: products.isActive,
      images: products.images,
    })
    .from(products)
    .orderBy(desc(products.createdAt));

  return rows.map((p) => {
    const images = Array.isArray(p.images) ? p.images : [];
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price,
      isActive: p.isActive,
      first_image: images[0] ?? null,
      second_image: images[1] ?? null,
    };
  });
}

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
    .orderBy(asc(productVariations.sort));

  return { product, variations };
}
