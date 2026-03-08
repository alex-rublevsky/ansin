import {
	DeleteObjectCommand,
	HeadObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import type { APIRoute } from "astro";
import { requireAdmin } from "../../../../lib/auth";
import { getStorageKey } from "../../../../lib/storage";

export const prerender = false;

const region = import.meta.env.YANDEX_STORAGE_REGION || "ru-central1";
const bucket = import.meta.env.YANDEX_STORAGE_BUCKET || "";

const s3Client = new S3Client({
	endpoint:
		import.meta.env.YANDEX_STORAGE_ENDPOINT ||
		"https://storage.yandexcloud.net",
	region: region,
	credentials: {
		accessKeyId: import.meta.env.YANDEX_STORAGE_ACCESS_KEY || "",
		secretAccessKey: import.meta.env.YANDEX_STORAGE_SECRET_KEY || "",
	},
	forcePathStyle: true,
});

export const POST: APIRoute = async ({ request, locals }) => {
	const authError = requireAdmin(locals);
	if (authError) return authError;
	try {
		const data = await request.json();
		const { filename, currentImages } = data;

		if (!filename) {
			return new Response(JSON.stringify({ error: "No filename provided" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Check if this image is still referenced in the current images list
		// This prevents deleting files that are still used (duplicate references)
		if (currentImages) {
			// Parse current images (handle both comma-separated and JSON array formats)
			let imageArray: string[] = [];
			try {
				const parsed = JSON.parse(currentImages);
				imageArray = Array.isArray(parsed) ? parsed : [];
			} catch {
				// If not JSON, treat as comma-separated string
				imageArray = currentImages
					.split(",")
					.map((img: string) => img.trim())
					.filter(Boolean);
			}

			// Check if the filename still exists in the current images
			const stillReferenced = imageArray.some(
				(img: string) => img.trim() === filename.trim(),
			);

			if (stillReferenced) {
				console.log(
					`⏭️ Skipping deletion of ${filename} - still referenced in current images`,
				);
				return new Response(
					JSON.stringify({
						success: true,
						message: "Image not deleted - still referenced in product",
						skipped: true,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				);
			}
		}

		// Get the storage key (handles both relative paths and full URLs)
		const key = getStorageKey(filename);

		// Check if file exists
		try {
			await s3Client.send(
				new HeadObjectCommand({
					Bucket: bucket,
					Key: key,
				}),
			);
		} catch (_error) {
			// File doesn't exist, but that's okay - maybe already deleted
			console.warn(`File not found in storage: ${key}`);
			return new Response(
				JSON.stringify({
					success: true,
					message: "File not found (may have been already deleted)",
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Delete from storage
		await s3Client.send(
			new DeleteObjectCommand({
				Bucket: bucket,
				Key: key,
			}),
		);

		return new Response(
			JSON.stringify({
				success: true,
				message: "Image deleted successfully",
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error deleting image:", error);
		return new Response(
			JSON.stringify({
				error: "Failed to delete image",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
