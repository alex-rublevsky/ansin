import {
  requireAdmin,
  variationRowsOrThrow,
} from "@/actions/dashboard/products/shared";
import { createProduct } from "@/db/dashboard/products/createProduct";
import { variationsFormField } from "@/lib/schemas/product";
import { updateMedia } from "@/lib/update-media";
import { z } from "astro/zod";
import { defineAction } from "astro:actions";

export const createProductAction = defineAction({
  accept: "form",
  input: z.object({
    name: z.string(),
    slug: z.string(),
    categoryId: z.coerce.number(),
    volume: z.coerce.number(),
    cakeVolume: z.coerce.number().default(0),
    description: z.string(),
    isActive: z.coerce.boolean().default(true),
    images: z.array(z.string()).default([]),
    variations: variationsFormField,
  }),
  handler: async (input, { locals }) => {
    requireAdmin(locals);

    const finalImages = await updateMedia({
      slug: input.slug,
      submittedImages: input.images,
    });

    const created = await createProduct({
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

    return `Товар "${created.name}" добавлен`;
  },
});
