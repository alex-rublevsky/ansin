import type { APIRoute } from "astro";
import { createCategory } from "../../../db/repositories/categories";
import { trackChange } from "../../../db/repositories/deployments";
import { requireAdmin } from "../../../lib/auth";
import { categorySchema } from "../../../lib/schemas/category";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
	const authError = requireAdmin(locals);
	if (authError) return authError;

	try {
		const data = await request.json();
		const parsed = categorySchema.safeParse(data);

		if (!parsed.success) {
			return new Response(
				JSON.stringify({
					error: "Ошибка валидации",
					details: parsed.error.issues,
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const category = await createCategory(parsed.data);

		await trackChange({
			entityType: "category",
			entitySlug: category.slug,
			action: "create",
			description: `Создана категория "${category.name}"`,
		});

		return new Response(JSON.stringify({ success: true, category }), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Category creation error:", error);
		return new Response(
			JSON.stringify({ error: "Failed to create category" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
