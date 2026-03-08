import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
		const { filename } = data;

		if (!filename) {
			return new Response(JSON.stringify({ error: "No filename provided" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Get the storage key (handles both relative paths and full URLs)
		const key = getStorageKey(filename);

		// Use HEAD request to get metadata without downloading the file
		const command = new HeadObjectCommand({
			Bucket: bucket,
			Key: key,
		});

		const response = await s3Client.send(command);

		return new Response(
			JSON.stringify({
				success: true,
				metadata: {
					size: response.ContentLength || 0,
					contentType: response.ContentType,
					uploaded: response.LastModified,
				},
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Error fetching image metadata:", error);

		// If file not found, return null metadata instead of error
		const err = error as {
			name?: string;
			$metadata?: { httpStatusCode?: number };
		};
		if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
			return new Response(
				JSON.stringify({
					success: true,
					metadata: null,
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		return new Response(
			JSON.stringify({
				error: "Failed to fetch image metadata",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
