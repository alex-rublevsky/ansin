
import { db } from "@/db";

// export type Product = Pick<
//   InferSelectModel<typeof products>,
//   "isActive" | "price"
// >;

export async function getAllStorefrontProducts() {
  return await db.query.products.findMany({
    where: { isActive: true },
    columns: {
      description: false,
    },
    orderBy: { categoryId: "asc" },
    with: {
      category: { columns: { slug: true } },
      variations: { orderBy: { weight: "desc" } },
    },
  });
}
