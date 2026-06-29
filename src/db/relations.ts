import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  products: {
    category: r.one.categories({
      from: r.products.categoryId,
      to: r.categories.id,
    }),
    variations: r.many.productVariations(),
  },
  productVariations: {
    product: r.one.products({
      from: r.productVariations.productId,
      to: r.products.id,
    }),
  },
  categories: {
    products: r.many.products(),
  },
}));
