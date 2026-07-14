
import { db } from "@/db";
import {
  type Product,
  type ProductVariation
} from "@/db/schema";

export type DashboardProductDetail = {
  product: Product;
  variations: ProductVariation[];
};

export async function getProductBySlug(slug?: string) {
  if (!slug) throw new Error("slug is required");

  return await db.query.products.findFirst({
    where: {
      slug: slug,
    },
    with: {
      variations: { orderBy: { weight: "desc" } },
    },
  });
}
