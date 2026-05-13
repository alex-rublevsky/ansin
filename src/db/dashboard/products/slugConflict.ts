import { and, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { products } from "@/db/schema";

export async function findProductSlugConflict(
  slug: string,
  exceptProductId?: number,
): Promise<{ id: number } | undefined> {
  const where =
    exceptProductId === undefined
      ? eq(products.slug, slug)
      : and(eq(products.slug, slug), ne(products.id, exceptProductId));

  const [conflict] = await db
    .select({ id: products.id })
    .from(products)
    .where(where)
    .limit(1);

  return conflict;
}
