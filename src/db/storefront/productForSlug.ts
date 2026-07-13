import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { products } from "@/db/schema";

export type StorefrontProduct = {
  id: number;
  slug: string;
  name: string;
  description: string;
  volume: number;
  cakeVolume: number;
  images: string[];
};

export async function getProductsForSlugPages() {
  // : Promise<StorefrontProduct[]>
  // const rows = await db
  //   .select({
  //     id: products.id,
  //     slug: products.slug,
  //     name: products.name,
  //     description: products.description,
  //     volume: products.volume,
  //     cakeVolume: products.cakeVolume,
  //     images: products.images,
  //   })
  //   .from(products)
  //   .where(eq(products.isActive, true))
  //   .orderBy(desc(products.createdAt));
  // const byProduct = await getVariationsGroupedByProductId(
  //   rows.map((p) => p.id),
  // );
  // return rows.map((p) => ({
  //   ...p,
  //   images: Array.isArray(p.images) ? p.images : [],
  //   variations: byProduct.get(p.id) ?? [],
  // }));
  return await db.query.products.findMany({
    // columns: {},
    where: { isActive: true },
    with: {
      variations: { orderBy: { weight: "desc" } },
    },
  });
}
