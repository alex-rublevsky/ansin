import type { APIRoute } from "astro";
import { updateOrderStatus } from "../../../../db/repositories/orders";
import { requireAdmin } from "../../../../lib/auth";

export const prerender = false;

export const PUT: APIRoute = async ({ params, request, locals }) => {
	const authError = requireAdmin(locals);
	if (authError) return authError;

	const rawId = params?.id;
	if (rawId === undefined) {
		return new Response(JSON.stringify({ error: "Missing id" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}
	const id = parseInt(rawId, 10);

	try {
		const { status } = await request.json();

		if (!["pending", "confirmed", "cancelled"].includes(status)) {
			return new Response(JSON.stringify({ error: "Invalid status" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const order = await updateOrderStatus(id, status);

		if (!order) {
			return new Response(JSON.stringify({ error: "Order not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response(JSON.stringify({ success: true, order }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Order update error:", error);
		return new Response(JSON.stringify({ error: "Failed to update order" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
