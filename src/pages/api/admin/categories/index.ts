import type { APIRoute } from "astro";
import {
	createCategory,
	getCategoryBySlug,
} from "../../../../db/repositories/categories";
import { trackChange } from "../../../../db/repositories/deployments";
import { requireAdmin } from "../../../../lib/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
	const authError = requireAdmin(locals);
	if (authError) return authError;

	try {
		const body = await request.json();
		const { name, slug, description, displayOrder } = body;

		if (!name || !slug) {
			return new Response(
				JSON.stringify({ error: "Название и ярлык обязательны" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		if (!/^[a-z0-9-]+$/.test(slug)) {
			return new Response(
				JSON.stringify({
					error: "Ярлык может содержать только строчные буквы, цифры и дефисы",
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const existing = await getCategoryBySlug(slug);
		if (existing) {
			return new Response(
				JSON.stringify({ error: "Категория с таким ярлыком уже существует" }),
				{ status: 409, headers: { "Content-Type": "application/json" } },
			);
		}

		const category = await createCategory({
			name,
			slug,
			description: description || null,
			displayOrder: displayOrder ?? 0,
		});

		await trackChange({
			entityType: "category",
			entitySlug: category.slug,
			action: "create",
			description: `Создана категория "${category.name}"`,
		});

		return new Response(JSON.stringify(category), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Category create error:", error);
		return new Response(
			JSON.stringify({ error: "Не удалось создать категорию" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
