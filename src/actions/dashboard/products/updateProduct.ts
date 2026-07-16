import {
  requireAdmin,
  variationRowsOrThrow,
} from "@/actions/dashboard/products/shared";
import { getProductImagesById } from "@/db/dashboard/products/getProductImagesById";
import { updateProduct } from "@/db/dashboard/products/updateProduct";
import { variationsFormField } from "@/lib/schemas/product";
import { updateMedia } from "@/lib/update-media";
import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";

export const updateProductAction = defineAction({
  accept: "form",
  input: z.object({
    id: z.coerce.number(),
    isActive: z.coerce.boolean().default(false),
    name: z.string(),
    slug: z.string(),
    categoryId: z.coerce.number(),
    volume: z.coerce.number(),
    cakeVolume: z.coerce.number().default(0),
    description: z.string(),
    images: z.array(z.string()).default([]),
    variations: variationsFormField,
  }),
  handler: async (input, { locals }) => {
    requireAdmin(locals);

    const currentProduct = await getProductImagesById(input.id);
    if (!currentProduct) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Product not found.",
      });
    }

    const finalImages = await updateMedia({
      productId: input.id,
      slug: input.slug,
      currentImages: currentProduct.images ?? [],
      submittedImages: input.images,
    });

    const updated = await updateProduct({
      id: input.id,
      isActive: input.isActive,
      name: input.name,
      slug: input.slug,
      categoryId: input.categoryId,
      volume: input.volume,
      cakeVolume: input.cakeVolume,
      description: input.description,
      images: finalImages,
      variations: variationRowsOrThrow(
        input.slug,
        input.volume,
        input.cakeVolume,
        input.variations,
      ),
    });

    if (!updated) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "Товар не найден",
      });
    }

    return `Товар "${updated.name}" сохранён`;
  },
});
