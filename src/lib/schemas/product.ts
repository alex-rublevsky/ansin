import { z } from "zod";

/**
 * Shared product validation schema.
 * Used by both API endpoints (server-side) and can be imported client-side if needed.
 */

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Accepts both an array of strings and a comma-separated string, always outputs string[] */
const imagesSchema = z
	.union([
		z.array(z.string().trim()).default([]),
		z.string().transform((val) =>
			val
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean),
		),
	])
	.default([]);

export const productSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Название обязательно")
		.max(500, "Название слишком длинное"),
	slug: z
		.string()
		.trim()
		.min(1, "Ярлык обязателен")
		.max(200, "Ярлык слишком длинный")
		.regex(
			SLUG_REGEX,
			"Ярлык должен содержать только строчные латинские буквы, цифры и дефисы",
		),
	description: z
		.string()
		.trim()
		.min(1, "Описание обязательно")
		.max(10000, "Описание слишком длинное"),
	price: z
		.number()
		.finite("Цена должна быть числом")
		.nonnegative("Цена не может быть отрицательной"),
	volume: z
		.number()
		.int("Объём должен быть целым числом")
		.nonnegative("Объём не может быть отрицательным")
		.default(0),
	categoryId: z.number().int().positive().nullable().default(null),
	images: imagesSchema,
	isActive: z.boolean().default(true),
	priceUp: z.boolean().default(true),
});

export type ProductInput = z.infer<typeof productSchema>;
