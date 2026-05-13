import { defineAction } from "astro:actions";

import { productSchema } from "@/lib/schemas/product";
import { createDashboardProduct } from "@/server/dashboard/products/createProduct";
import { toProductActionError } from "./errors";

export const createProductAction = defineAction({
  input: productSchema,
  handler: async (input) => {
    try {
      const product = await createDashboardProduct(input);
      return { product };
    } catch (err) {
      throw toProductActionError(err);
    }
  },
});
