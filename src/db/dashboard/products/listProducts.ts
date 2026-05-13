import { desc } from "drizzle-orm";

import { db } from "@/db";
import { products } from "@/db/schema";

export type DashboardFeedProduct = {
  slug: string;
  name: string;
  isActive: boolean;
  first_image: string | null;
  second_image: string | null;
};

export async function listDashboardProducts(): Promise<DashboardFeedProduct[]> {
  const rows = await db
    .select({
      slug: products.slug,
      name: products.name,
      isActive: products.isActive,
      images: products.images,
    })
    .from(products)
    .orderBy(desc(products.createdAt));

  return rows.map((p) => {
    const images = Array.isArray(p.images) ? p.images : [];
    return {
      slug: p.slug,
      name: p.name,
      isActive: p.isActive,
      first_image: images[0] ?? null,
      second_image: images[1] ?? null,
    };
  });
}
