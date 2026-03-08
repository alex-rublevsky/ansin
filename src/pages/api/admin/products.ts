import type { APIRoute } from "astro";
import { trackChange } from "../../../db/repositories/deployments";
import {
	createProduct,
	getProductById,
} from "../../../db/repositories/products";
import { replaceVariationsForProduct } from "../../../db/repositories/variations";
import { requireAdmin } from "../../../lib/auth";
import { productSchema } from "../../../lib/schemas/product";
import { deleteProductImage, moveStagingToFinalBatch } from "../../../lib/storage";
import { generateVariations } from "../../../lib/variations";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
	const authError = requireAdmin(locals);
	if (authError) return authError;

	let movedImages: string[] = [];

	try {
		const raw = await request.json();
		const parsed = productSchema.safeParse(raw);

		if (!parsed.success) {
			return new Response(
				JSON.stringify({
					error: "Validation failed",
					details: parsed.error.flatten().fieldErrors,
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const data = parsed.data;

		// Separate staging images from final images
		const stagingImages = data.images.filter(
			(path) =>
				path.startsWith("staging/") || path.startsWith("images/staging/"),
		);

		// Move staged images to final location
		const moveResult = await moveStagingToFinalBatch(stagingImages, data.name);
		movedImages = moveResult.movedImages;

		// Preserve original order: replace staging paths with their moved counterparts
		const allImages = data.images
			.map((path) => moveResult.pathMap[path] ?? path)
			.filter((path) => !moveResult.failedImages.includes(path));

		const product = await createProduct({
			name: data.name,
			description: data.description,
			price: data.price,
			volume: data.volume,
			slug: data.slug,
			categoryId: data.categoryId,
			images: allImages,
			isActive: data.isActive,
			priceUp: data.priceUp,
		});

		// Auto-generate variations if product has weight
		if (product.volume > 0) {
			const variations = generateVariations(
				product.price,
				product.volume,
				product.slug,
				product.priceUp,
			);
			await replaceVariationsForProduct(
				product.id,
				variations.map((v, i) => ({
					weight: v.weight,
					price: v.price,
					sku: v.sku,
					sort: i,
				})),
			);
		}

		await trackChange({
			entityType: "product",
			entitySlug: product.slug,
			action: "create",
			description: `Создан товар "${product.name}"`,
		});

		return new Response(JSON.stringify({ success: true, product }), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Product creation error:", error);

		// Cleanup: delete moved images if product creation failed
		if (movedImages.length > 0) {
			await Promise.allSettled(
				movedImages.map((imagePath) =>
					deleteProductImage(imagePath).catch((e) =>
						console.warn(`Failed to cleanup orphaned image ${imagePath}:`, e),
					),
				),
			);
		}

		const message = error instanceof Error ? error.message : String(error);
		return new Response(
			JSON.stringify({ error: "Failed to create product", details: message }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};

export const GET: APIRoute = async ({ url, locals }) => {
	const authError = requireAdmin(locals);
	if (authError) return authError;

	const id = url.searchParams.get("id");

	if (!id) {
		return new Response(JSON.stringify({ error: "Product ID required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const product = await getProductById(parseInt(id, 10));

		if (!product) {
			return new Response(JSON.stringify({ error: "Product not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response(JSON.stringify({ product }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (_error) {
		return new Response(JSON.stringify({ error: "Failed to fetch product" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
