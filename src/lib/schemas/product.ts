import { z } from "astro/zod";

// Slug is derived server-side from the current product name.
// The product row's price column is intentionally not part of this form:
// storefront pricing comes from product variations.

const variationSchema = z.object({
  weight: z
    .number()
    .int("Вес должен быть целым числом")
    .positive("Вес должен быть больше нуля"),
  price: z.number().positive("Цена должна быть больше нуля"),
});

export const productSchema = z.object({
  // Relative S3 paths (e.g. "images/staging/.../file.webp" for newly uploaded,
  // "images/slug/file.webp" for already-committed). The action moves staging
  // paths to their final location before saving.
  images: z
    .array(
      z
        .string()
        .min(1)
        .regex(/^images\//, "Invalid image path"),
    )
    .default([]),
  name: z
    .string()
    .trim()
    .min(1, "Название обязательно")
    .max(500, "Название слишком длинное"),
  description: z
    .string()
    .trim()
    .min(1, "Описание обязательно")
    .max(10000, "Описание слишком длинное"),
  volume: z
    .number()
    .int("Объём должен быть целым числом")
    .positive("Введите корректный объём"),
  cakeVolume: z
    .number()
    .int("Объём блина должен быть целым числом")
    .nonnegative("Объём блина не может быть отрицательным")
    .default(0),
  isActive: z.boolean().default(true),
  categoryId: z.number().int().positive().nullable().default(null),
  variations: z.array(variationSchema).default([]),
});

export type ProductInput = z.infer<typeof productSchema>;
export type VariationInput = z.infer<typeof variationSchema>;
