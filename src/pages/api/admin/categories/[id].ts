import type { APIRoute } from "astro";
import {
	deleteCategory,
	getCategoryById,
	getCategoryBySlug,
	updateCategory,
} from "../../../../db/repositories/categories";
import { trackChange } from "../../../../db/repositories/deployments";
import { getProductCountByCategoryId } from "../../../../db/repositories/products";
import { requireAdmin } from "../../../../lib/auth";

export const prerender = false;

function parseId(raw: string | undefined): number | null {
	if (raw === undefined) return null;
	const id = parseInt(raw, 10);
	return Number.isNaN(id) ? null : id;
}

export const PATCH: APIRoute = async ({ params, request, locals }) => {
	const authError = requireAdmin(locals);
	if (authError) return authError;

	const id = parseId(params?.id);
	if (id === null) {
		return new Response(JSON.stringify({ error: "Неверный ID" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const category = await getCategoryById(id);
		if (!category) {
			return new Response(JSON.stringify({ error: "Категория не найдена" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		const body = await request.json();
		const { name, slug, description, displayOrder } = body;

		if (slug && slug !== category.slug) {
			if (!/^[a-z0-9-]+$/.test(slug)) {
				return new Response(
					JSON.stringify({
						error:
							"Ярлык может содержать только строчные буквы, цифры и дефисы",
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}
			const existing = await getCategoryBySlug(slug);
			if (existing) {
				return new Response(
					JSON.stringify({
						error: "Категория с таким ярлыком уже существует",
					}),
					{ status: 409, headers: { "Content-Type": "application/json" } },
				);
			}
		}

		const updated = await updateCategory(id, {
			...(name !== undefined && { name }),
			...(slug !== undefined && { slug }),
			...(description !== undefined && { description: description || null }),
			...(displayOrder !== undefined && { displayOrder }),
		});

		await trackChange({
			entityType: "category",
			entitySlug: updated?.slug ?? category.slug,
			action: "update",
			description: `Обновлена категория "${updated?.name ?? category.name}"`,
		});

		return new Response(JSON.stringify(updated), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Category update error:", error);
		return new Response(
			JSON.stringify({ error: "Не удалось обновить категорию" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};

export const DELETE: APIRoute = async ({ params, locals }) => {
	const authError = requireAdmin(locals);
	if (authError) return authError;

	const id = parseId(params?.id);
	if (id === null) {
		return new Response(JSON.stringify({ error: "Неверный ID" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const category = await getCategoryById(id);
		if (!category) {
			return new Response(JSON.stringify({ error: "Категория не найдена" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		const productCount = await getProductCountByCategoryId(id);
		if (productCount > 0) {
			return new Response(
				JSON.stringify({
					error: `Нельзя удалить категорию с товарами (${productCount}). Сначала переместите или удалите товары.`,
				}),
				{ status: 409, headers: { "Content-Type": "application/json" } },
			);
		}

		await deleteCategory(id);

		await trackChange({
			entityType: "category",
			entitySlug: category.slug,
			action: "delete",
			description: `Удалена категория "${category.name}"`,
		});

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Category delete error:", error);
		return new Response(
			JSON.stringify({ error: "Не удалось удалить категорию" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
