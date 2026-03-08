import { z } from "zod";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const categorySchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Название обязательно")
		.max(200, "Название слишком длинное"),
	slug: z
		.string()
		.trim()
		.min(1, "Ярлык обязателен")
		.max(100, "Ярлык слишком длинный")
		.regex(
			SLUG_REGEX,
			"Ярлык должен содержать только строчные латинские буквы, цифры и дефисы",
		),
	description: z.string().trim().max(2000).nullable().default(null),
	displayOrder: z
		.number()
		.int()
		.nonnegative("Порядок не может быть отрицательным")
		.default(0),
	isActive: z.boolean().default(true),
});

export type CategoryInput = z.infer<typeof categorySchema>;
