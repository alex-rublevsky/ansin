import { defineMiddleware } from "astro:middleware";
import { getAuth, isAdmin } from "./lib/auth";

const ALLOWED_ORIGINS = new Set([
	process.env.BETTER_AUTH_URL || "",
	"http://localhost:4321",
].filter(Boolean));

function getCorsHeaders(origin: string | null): Record<string, string> {
	const allowedOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
	return {
		"Access-Control-Allow-Origin": allowedOrigin,
		"Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	};
}

function jsonError(message: string, status: number, corsHeaders: Record<string, string>) {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: { "Content-Type": "application/json", ...corsHeaders },
	});
}

export const onRequest = defineMiddleware(async (context, next) => {
	const origin = context.request.headers.get("Origin");
	const corsHeaders = getCorsHeaders(origin);

	// CORS: Handle preflight for API routes
	if (
		context.url.pathname.startsWith("/api/") &&
		context.request.method === "OPTIONS"
	) {
		return new Response(null, {
			status: 204,
			headers: corsHeaders,
		});
	}

	// Auth: Protect /admin pages and /api/admin/* routes
	const isAdminPage =
		context.url.pathname.startsWith("/admin") &&
		!context.url.pathname.startsWith("/admin/login");
	const isAdminApi = context.url.pathname.startsWith("/api/admin/");

	if (isAdminPage || isAdminApi) {
		try {
			const auth = getAuth();
			const session = await auth.api.getSession({
				headers: context.request.headers,
			});

			if (!session || !session.user) {
				if (isAdminApi) return jsonError("Unauthorized", 401, corsHeaders);
				return context.redirect("/admin/login");
			}

			if (!isAdmin(session.user.email, process.env.ADMIN_EMAILS)) {
				if (isAdminApi) return jsonError("Forbidden", 403, corsHeaders);
				return context.redirect("/admin/login?error=unauthorized");
			}

			context.locals.user = session.user;
			context.locals.session = session.session;
		} catch (error) {
			console.error("Auth middleware error:", error);
			if (isAdminApi) return jsonError("Authentication error", 500, corsHeaders);
			return context.redirect("/admin/login");
		}
	}

	const response = await next();

	// Security headers
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set(
		"Permissions-Policy",
		"geolocation=(), microphone=(), camera=()",
	);
	response.headers.set(
		"Content-Security-Policy",
		[
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline'",
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' storage.yandexcloud.net data: blob:",
			"connect-src 'self' storage.yandexcloud.net",
			"font-src 'self'",
			"object-src 'none'",
			"base-uri 'self'",
			"form-action 'self'",
			"frame-ancestors 'none'",
		].join("; "),
	);

	// Prevent caching of admin pages (authenticated content must not be stale)
	if (context.url.pathname.startsWith("/admin")) {
		response.headers.set("Cache-Control", "no-store");
	}

	// CORS: Add headers to API responses
	if (context.url.pathname.startsWith("/api/")) {
		for (const [key, value] of Object.entries(corsHeaders)) {
			response.headers.set(key, value);
		}
	}

	return response;
});
