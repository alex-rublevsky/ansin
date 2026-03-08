import type { APIRoute } from "astro";
import {
	createOrder,
	generateOrderNumber,
} from "../../../db/repositories/orders";
import { getProductById } from "../../../db/repositories/products";
import {
	sendOrderConfirmation,
	sendOrderNotificationToAdmin,
} from "../../../lib/email";
import { cartOrderSchema } from "../../../lib/schemas/order";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();
		const parsed = cartOrderSchema.safeParse(body);

		if (!parsed.success) {
			return new Response(
				JSON.stringify({
					error: "Ошибка валидации",
					details: parsed.error.issues,
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const { customerName, customerEmail, customerPhone, notes, items } =
			parsed.data;

		// Fetch all products in parallel
		const productResults = await Promise.all(
			items.map((item) => getProductById(item.productId)),
		);

		const orderItems: Array<{
			productId: number;
			productName: string;
			quantity: number;
			price: number;
		}> = [];
		let totalAmount = 0;
		const priceChanges: Array<{ name: string; was: number; now: number }> = [];

		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const product = productResults[i];

			if (!product) {
				return new Response(
					JSON.stringify({ error: `Товар с ID ${item.productId} не найден` }),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			if (!product.isActive) {
				return new Response(
					JSON.stringify({ error: `Товар "${product.name}" недоступен` }),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			if (item.price !== product.price) {
				priceChanges.push({
					name: product.name,
					was: item.price,
					now: product.price,
				});
			}

			orderItems.push({
				productId: product.id,
				productName: product.name,
				quantity: item.quantity,
				price: product.price,
			});
			totalAmount += product.price * item.quantity;
		}

		if (priceChanges.length > 0) {
			return new Response(
				JSON.stringify({
					error: "Цены изменились с момента добавления в корзину",
					priceChanges,
				}),
				{ status: 409, headers: { "Content-Type": "application/json" } },
			);
		}

		const orderNumber = generateOrderNumber();

		const order = await createOrder({
			orderNumber,
			customerName,
			customerEmail,
			customerPhone,
			items: orderItems,
			totalAmount,
			status: "pending",
			notes,
		});

		await sendOrderConfirmation({ order, customerEmail });
		await sendOrderNotificationToAdmin(order);

		return new Response(
			JSON.stringify({
				success: true,
				orderNumber: order.orderNumber,
				orderId: order.id,
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	} catch (error) {
		console.error("Order creation error:", error);
		return new Response(JSON.stringify({ error: "Failed to create order" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
