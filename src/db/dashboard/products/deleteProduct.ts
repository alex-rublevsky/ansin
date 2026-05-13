import { eq } from "drizzle-orm";

import { db } from "@/db";
import { products } from "@/db/schema";

export async function deleteProduct(id: number): Promise<void> {
  await db.delete(products).where(eq(products.id, id));
}
