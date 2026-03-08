import { z } from "zod";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const customerFields = {
	customerName: z
		.string()
		.trim()
		.min(1, "Имя обязательно")
		.max(200, "Имя слишком длинное"),
	customerEmail: z
		.string()
		.trim()
		.min(1, "Email обязателен")
		.regex(EMAIL_REGEX, "Некорректный email"),
	customerPhone: z.string().trim().max(30).nullable().default(null),
	notes: z.string().trim().max(2000).nullable().default(null),
};

export const singleProductOrderSchema = z.object({
	...customerFields,
	productId: z.number().int().positive("Некорректный ID товара"),
	quantity: z
		.number()
		.int("Количество должно быть целым числом")
		.positive("Количество должно быть больше нуля")
		.max(1000, "Слишком большое количество"),
});

const cartItemSchema = z.object({
	productId: z.number().int().positive(),
	quantity: z
		.number()
		.int()
		.positive("Количество должно быть больше нуля")
		.max(1000),
	price: z.number().finite().min(0),
	variationId: z.number().int().positive().optional(),
});

export const cartOrderSchema = z.object({
	...customerFields,
	items: z
		.array(cartItemSchema)
		.min(1, "Корзина не может быть пустой")
		.max(50, "Слишком много позиций"),
});

export type SingleProductOrderInput = z.infer<typeof singleProductOrderSchema>;
export type CartOrderInput = z.infer<typeof cartOrderSchema>;
