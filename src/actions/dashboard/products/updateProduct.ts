import { defineAction } from "astro:actions";
import { z } from "astro/zod";

import { productSchema } from "@/lib/schemas/product";
import { updateDashboardProduct } from "@/server/dashboard/products/updateProduct";
import { toProductActionError } from "./errors";

export const updateProductAction = defineAction({
  input: productSchema.extend({ id: z.number().int().positive() }),
  handler: async (input) => {
    try {
      const product = await updateDashboardProduct(input);
      return { product };
    } catch (err) {
      throw toProductActionError(err);
    }
  },
});
