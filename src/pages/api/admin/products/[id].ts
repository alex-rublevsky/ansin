import type { APIRoute } from "astro";
import { trackChange } from "../../../../db/repositories/deployments";
import {
	deleteProduct,
	getProductById,
	updateProduct,
} from "../../../../db/repositories/products";
import { replaceVariationsForProduct } from "../../../../db/repositories/variations";
import { requireAdmin } from "../../../../lib/auth";
import { productSchema } from "../../../../lib/schemas/product";
import { deleteProductImage, moveStagingToFinalBatch } from "../../../../lib/storage";
import { generateVariations } from "../../../../lib/variations";

export const prerender = false;

export const PUT: APIRoute = async ({ params, request, locals }) => {
	const authError = requireAdmin(locals);
	if (authError) return authError;

	const id = params.id ? parseInt(params.id, 10) : 0;
	if (!id) {
		return new Response(JSON.stringify({ error: "Invalid product ID" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

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

		const product = await updateProduct(id, {
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

		if (!product) {
			return new Response(JSON.stringify({ error: "Product not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Regenerate variations
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
		} else {
			await replaceVariationsForProduct(product.id, []);
		}

		await trackChange({
			entityType: "product",
			entitySlug: product.slug,
			action: "update",
			description: `Обновлён товар "${product.name}"`,
		});

		return new Response(JSON.stringify({ success: true, product }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Product update error:", error);

		// Cleanup: delete moved images if product update failed
		if (movedImages.length > 0) {
			await Promise.allSettled(
				movedImages.map((imagePath) =>
					deleteProductImage(imagePath).catch((e) =>
						console.warn(`Failed to cleanup orphaned image ${imagePath}:`, e),
					),
				),
			);
		}

		return new Response(
			JSON.stringify({ error: "Failed to update product" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};

export const DELETE: APIRoute = async ({ params, locals }) => {
	const authError = requireAdmin(locals);
	if (authError) return authError;

	const id = params.id ? parseInt(params.id, 10) : 0;
	if (!id) {
		return new Response(JSON.stringify({ error: "Invalid product ID" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const product = await getProductById(id);

		if (!product) {
			return new Response(JSON.stringify({ error: "Product not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Delete all product images from storage
		if (product.images && product.images.length > 0) {
			await Promise.allSettled(
				product.images.map((imageUrl) => deleteProductImage(imageUrl)),
			);
		}

		await deleteProduct(id);

		await trackChange({
			entityType: "product",
			entitySlug: product.slug,
			action: "delete",
			description: `Удалён товар "${product.name}"`,
		});

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Product delete error:", error);
		return new Response(JSON.stringify({ error: "Failed to delete product" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
