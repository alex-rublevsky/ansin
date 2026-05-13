import type { z } from "astro/zod";

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export async function parseJsonBody<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): Promise<z.infer<TSchema> | Response> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (result.success) return result.data;

    return json(
      { error: result.error.issues[0]?.message ?? "Invalid JSON body" },
      400,
    );
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
}
