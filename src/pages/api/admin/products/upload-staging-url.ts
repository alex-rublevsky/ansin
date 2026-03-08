import type { APIRoute } from "astro";
import { requireAdmin } from "../../../../lib/auth";
import { getStagingUploadUrl } from "../../../../lib/storage";

export const prerender = false;

const ALLOWED_CONTENT_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/svg+xml",
]);

const MAX_FILENAME_LENGTH = 255;

/**
 * Returns a presigned URL for direct upload to Object Storage.
 * Client uploads file directly to the URL (PUT), bypassing API Gateway payload limits.
 */
export const POST: APIRoute = async ({ request, locals }) => {
	const authError = requireAdmin(locals);
	if (authError) return authError;
	try {
		const body = await request.json();
		const { filename, sessionId, contentType } = body as {
			filename?: string;
			sessionId?: string;
			contentType?: string;
		};

		if (!filename || typeof filename !== "string") {
			return new Response(JSON.stringify({ error: "filename is required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		if (filename.length > MAX_FILENAME_LENGTH) {
			return new Response(
				JSON.stringify({ error: "Filename too long (max 255 characters)" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const resolvedContentType = contentType || "image/jpeg";
		if (!ALLOWED_CONTENT_TYPES.has(resolvedContentType)) {
			return new Response(
				JSON.stringify({
					error: "Invalid content type. Allowed: JPEG, PNG, WebP, SVG",
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const { uploadUrl, imagePath } = await getStagingUploadUrl(
			filename,
			resolvedContentType,
			sessionId || undefined,
		);

		return new Response(
			JSON.stringify({ success: true, uploadUrl, imagePath }),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Presigned URL error:", error);
		return new Response(
			JSON.stringify({
				error: "Failed to get upload URL",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
