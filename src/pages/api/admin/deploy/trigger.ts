import type { APIRoute } from "astro";
import {
	createDeployment,
	getActiveDeployment,
	getPendingChanges,
} from "../../../../db/repositories/deployments";
import { requireAdmin } from "../../../../lib/auth";

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
	const authError = requireAdmin(locals);
	if (authError) return authError;

	try {
		// Check if there's already a deploy in progress
		const active = await getActiveDeployment();
		if (active) {
			return new Response(
				JSON.stringify({
					error: "Деплой уже запущен",
					deployment: active,
				}),
				{
					status: 409,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Check if there are pending changes
		const changes = await getPendingChanges();
		if (changes.length === 0) {
			return new Response(
				JSON.stringify({ error: "Нет изменений для деплоя" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Create deployment record
		const deployment = await createDeployment("dashboard", changes.length);

		// Trigger GitHub Actions workflow
		const ghRepo = import.meta.env.GITHUB_REPO || process.env.GITHUB_REPO;
		const ghToken = import.meta.env.GITHUB_PAT || process.env.GITHUB_PAT;

		if (!ghRepo || !ghToken) {
			return new Response(
				JSON.stringify({
					error: "GitHub integration not configured (GITHUB_REPO, GITHUB_PAT)",
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const workflowResponse = await fetch(
			`https://api.github.com/repos/${ghRepo}/actions/workflows/static-rebuild.yml/dispatches`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${ghToken}`,
					Accept: "application/vnd.github.v3+json",
				},
				body: JSON.stringify({
					ref: "main",
					inputs: {
						deployment_id: String(deployment.id),
					},
				}),
			},
		);

		if (!workflowResponse.ok) {
			console.error("GitHub Actions trigger failed:", workflowResponse.status);

			const { updateDeploymentStatus } = await import(
				"../../../../db/repositories/deployments"
			);
			await updateDeploymentStatus(deployment.id, "failed");

			return new Response(
				JSON.stringify({
					error: "Не удалось запустить CI/CD",
				}),
				{
					status: 502,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		return new Response(JSON.stringify({ success: true, deployment }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Deploy trigger error:", error);
		return new Response(JSON.stringify({ error: "Failed to trigger deploy" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
