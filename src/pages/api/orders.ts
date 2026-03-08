import type { APIRoute } from "astro";
import { createOrder, generateOrderNumber } from "../../db/repositories/orders";
import { getProductById } from "../../db/repositories/products";
import {
	sendOrderConfirmation,
	sendOrderNotificationToAdmin,
} from "../../lib/email";
import { singleProductOrderSchema } from "../../lib/schemas/order";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();
		const parsed = singleProductOrderSchema.safeParse(body);

		if (!parsed.success) {
			return new Response(
				JSON.stringify({
					error: "Ошибка валидации",
					details: parsed.error.issues,
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const { productId, quantity, customerName, customerEmail, customerPhone, notes } = parsed.data;

		const product = await getProductById(productId);

		if (!product) {
			return new Response(JSON.stringify({ error: "Product not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		if (!product.isActive) {
			return new Response(
				JSON.stringify({ error: "Product is not available" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const orderNumber = generateOrderNumber();
		const totalAmount = product.price * quantity;

		const order = await createOrder({
			orderNumber,
			customerName,
			customerEmail,
			customerPhone,
			items: [
				{
					productId: product.id,
					productName: product.name,
					quantity,
					price: product.price,
				},
			],
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
