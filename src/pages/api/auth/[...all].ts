import type { APIRoute } from "astro";
import { auth } from "../../../lib/auth";

export const prerender = false;

export const ALL: APIRoute = async (ctx) => {
	try {
		return await auth.handler(ctx.request);
	} catch (error) {
		console.error("Auth handler error:", error);
		return new Response(JSON.stringify({ error: "Authentication error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
