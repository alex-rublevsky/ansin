import { asc, eq, gt, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, products } from "@/db/schema";

export type StorefrontCategoryFilter = {
  id: number;
  name: string;
  slug: string;
  productCount: number;
};

export async function listStorefrontCategories(): Promise<
  StorefrontCategoryFilter[]
> {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      productCount: sql<number>`count(${products.id})`,
    })
    .from(categories)
    .innerJoin(products, eq(products.categoryId, categories.id))
    .where(eq(products.isActive, true))
    .groupBy(categories.id)
    .having(gt(sql<number>`count(${products.id})`, 0))
    .orderBy(asc(categories.displayOrder), asc(categories.name));
}
