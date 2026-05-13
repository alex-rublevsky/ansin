import { asc } from "drizzle-orm";

import { db } from "@/db";
import { categories } from "@/db/schema";

export type DashboardCategoryOption = {
  id: number;
  name: string;
  slug: string;
};

export async function listDashboardCategories(): Promise<
  DashboardCategoryOption[]
> {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
    })
    .from(categories)
    .orderBy(asc(categories.displayOrder), asc(categories.name));
}
