import type { APIRoute } from "astro";
import { z } from "astro/zod";
import { json, parseJsonBody } from "@/lib/api/json";
import { getStagingUploadUrl } from "@/lib/storage";

export const prerender = false;

const bodySchema = z.object({
  filename: z
    .string()
    .trim()
    .min(1, "filename is required")
    .max(255, "Filename too long (max 255 characters)"),
  contentType: z
    .enum(["image/jpeg", "image/png", "image/webp", "image/avif"], {
      message: "Invalid content type. Allowed: JPEG, PNG, WebP, AVIF",
    })
    .default("image/jpeg"),
  sessionId: z.string().optional(),
});

/**
 * POST /api/dashboard/images/staging-url
 * Body: { filename: string; contentType: string; sessionId?: string }
 *
 * Returns a short-lived presigned PUT URL so the client can upload directly
 * to Yandex Object Storage, bypassing server payload limits.
 */
export const POST: APIRoute = async ({ request }) => {
  const body = await parseJsonBody(request, bodySchema);
  if (body instanceof Response) return body;

  const { filename, contentType, sessionId } = body;

  try {
    const { uploadUrl, imagePath } = await getStagingUploadUrl(
      filename,
      contentType,
      sessionId,
    );
    return json({ success: true, uploadUrl, imagePath });
  } catch (err) {
    console.error("staging-url error:", err);
    return json({ error: "Failed to generate upload URL" }, 500);
  }
};
