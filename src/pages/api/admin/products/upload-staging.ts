import type { APIRoute } from "astro";
import { requireAdmin } from "../../../../lib/auth";
import { uploadToStaging } from "../../../../lib/storage";

export const prerender = false;

const MAX_FILE_SIZE = 1.5 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
	"image/avif",
]);

export const POST: APIRoute = async ({ request, locals }) => {
	const authError = requireAdmin(locals);
	if (authError) return authError;
	try {
		const formData = await request.formData();
		const file = formData.get("image") as File;
		const sessionId = formData.get("sessionId") as string | null;

		if (!file || file.size === 0) {
			return new Response(JSON.stringify({ error: "No file provided" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		if (file.size > MAX_FILE_SIZE) {
			return new Response(
				JSON.stringify({ error: "File too large (max 10 MB)" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		if (!ALLOWED_TYPES.has(file.type)) {
			return new Response(
				JSON.stringify({
					error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, AVIF",
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const imagePath = await uploadToStaging(file, sessionId || undefined);

		return new Response(JSON.stringify({ success: true, imagePath }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Staging upload error:", error);
		return new Response(
			JSON.stringify({
				error: "Failed to upload image to staging",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
