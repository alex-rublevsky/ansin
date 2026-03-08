import type { APIRoute } from "astro";
import {
	getActiveDeployment,
	getLastDeployment,
	getPendingChanges,
} from "../../../../db/repositories/deployments";
import { requireAdmin } from "../../../../lib/auth";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
	const authError = requireAdmin(locals);
	if (authError) return authError;

	try {
		const [lastDeployment, activeDeployment] = await Promise.all([
			getLastDeployment(),
			getActiveDeployment(),
		]);
		const pendingChanges = await getPendingChanges(lastDeployment);

		return new Response(
			JSON.stringify({
				pendingChanges,
				lastDeployment,
				activeDeployment,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Deploy status error:", error);
		return new Response(
			JSON.stringify({ error: "Failed to get deploy status" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
