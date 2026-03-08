import { timingSafeEqual } from "node:crypto";
import type { APIRoute } from "astro";
import {
	createDeployment,
	getPendingChanges,
	updateDeploymentStatus,
} from "../../../../db/repositories/deployments";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	// Authenticate via shared secret (used by GitHub Actions and deploy.sh)
	const authHeader = request.headers.get("Authorization");
	const deploySecret =
		import.meta.env.DEPLOY_SECRET || process.env.DEPLOY_SECRET;
	const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";

	if (
		!deploySecret ||
		!token ||
		token.length !== deploySecret.length ||
		!timingSafeEqual(Buffer.from(token), Buffer.from(deploySecret))
	) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const data = await request.json();
		const { deployment_id, status, source } = data;

		// Local/CI deploys: create a deployment record and immediately complete it
		if (source === "local" || source === "ci") {
			const changes = await getPendingChanges();
			const deployment = await createDeployment(source, changes.length);
			const completed = await updateDeploymentStatus(
				deployment.id,
				"completed",
			);
			return new Response(
				JSON.stringify({ success: true, deployment: completed }),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Dashboard deploys: update existing deployment by ID
		if (!deployment_id || !["completed", "failed"].includes(status)) {
			return new Response(
				JSON.stringify({
					error:
						"Invalid request: deployment_id and status (completed|failed) required",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const id = parseInt(deployment_id, 10);
		if (Number.isNaN(id)) {
			return new Response(
				JSON.stringify({ error: "Invalid deployment_id" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const deployment = await updateDeploymentStatus(id, status);

		return new Response(JSON.stringify({ success: true, deployment }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Deploy complete error:", error);
		return new Response(
			JSON.stringify({ error: "Failed to update deployment status" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
