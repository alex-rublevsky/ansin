import { requireAdmin } from "@/actions/dashboard/products/shared";
import { deleteProduct } from "@/db/dashboard/products/deleteProduct";
import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";

export const deleteProductAction = defineAction({
  accept: "form",
  input: z.object({
    id: z.coerce.number().int().positive(),
  }),
  handler: async (input, { locals }) => {
    requireAdmin(locals);

    try {
      const deleted = await deleteProduct(input.id);
      return `Товар "${deleted.name}" успешно удалён`;
    } catch (error) {
      if (error instanceof Error && error.message === "Product not found") {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Товар не найден",
        });
      }
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Не удалось удалить товар. Попробуйте снова.",
      });
    }
  },
});
