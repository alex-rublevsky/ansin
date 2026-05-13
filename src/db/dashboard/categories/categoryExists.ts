import { eq } from "drizzle-orm";

import { db } from "@/db";
import { categories } from "@/db/schema";

export async function categoryExists(id: number): Promise<boolean> {
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  return !!category;
}
