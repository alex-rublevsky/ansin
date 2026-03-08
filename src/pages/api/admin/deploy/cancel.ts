import type { APIRoute } from "astro";
import {
	cancelDeployment,
	getActiveDeployment,
} from "../../../../db/repositories/deployments";
import { requireAdmin } from "../../../../lib/auth";

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
	const authError = requireAdmin(locals);
	if (authError) return authError;

	try {
		const active = await getActiveDeployment();
		if (!active) {
			return new Response(JSON.stringify({ error: "Нет активного деплоя" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		await cancelDeployment(active.id);

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Deploy cancel error:", error);
		return new Response(JSON.stringify({ error: "Failed to cancel deploy" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
