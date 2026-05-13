import { defineAction } from "astro:actions";
import { z } from "astro/zod";

import { deleteDashboardProduct } from "@/server/dashboard/products/deleteProduct";
import { toProductActionError } from "./errors";

export const deleteProductAction = defineAction({
  input: z.object({ id: z.number().int().positive() }),
  handler: async ({ id }) => {
    try {
      await deleteDashboardProduct(id);
      return { success: true };
    } catch (err) {
      throw toProductActionError(err);
    }
  },
});
