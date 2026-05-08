import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { categories } from "@/db/schema";

export type ActiveCategory = {
  id: number;
  name: string;
  slug: string;
};

// TODO: remove the active categories from db as such, instead make it about the non empty categories
export async function getActiveCategories(): Promise<ActiveCategory[]> {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
    })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.displayOrder), asc(categories.name));
}
