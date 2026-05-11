import { PUBLIC_BETTER_AUTH_URL } from "astro:env/server";
import { defineMiddleware } from "astro:middleware";
import { auth, isAdmin } from "./lib/auth";

const ALLOWED_ORIGINS = new Set(
  [
    PUBLIC_BETTER_AUTH_URL,
    "http://localhost:4321",
    "http://localhost:4322",
  ].filter((v, i, a) => a.indexOf(v) === i),
);

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonError(
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isApiRoute = pathname.startsWith("/api/");
  const isActionRoute = pathname.startsWith("/_actions/");
  const isAdminPage =
    pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/dashboard/login");
  const isAdminApi = pathname.startsWith("/api/dashboard/");
  const isDashboardAction = pathname.startsWith("/_actions/dashboard.");
  /**
   * POST /api/dashboard/deploy/complete (not implemented yet)
   *
   * This URL is excluded from the session + SECRET_ADMIN_EMAILS gate above so CI
   * can call it without a browser cookie. When you add the route:
   * - Require a shared secret (e.g. Authorization: Bearer <DEPLOY_HOOK_TOKEN>)
   *   or HMAC/signature validated against env; reject missing/invalid with 401.
   * - Do not rely on CORS alone (servers don’t send Origin the same way browsers do).
   * - Rate-limit and log failures; keep the token only in server env (Lockbox/CI secrets).
   *
   * See scripts/deploy.sh for the intended caller.
   */
  const isDeployCallback = pathname === "/api/dashboard/deploy/complete";

  // Skip header access for prerendered public pages
  if (!isApiRoute && !isActionRoute && !isAdminPage) {
    return next();
  }

  const origin = context.request.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  // CORS: Handle preflight for API routes
  if (isApiRoute && context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // CSRF: Block state-changing requests from unknown origins
  const method = context.request.method;
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return jsonError("Cross-origin request blocked", 403, corsHeaders);
    }
  }

  // Auth: dashboard (excl. login), /api/dashboard/* (excl. deploy callback), /_actions/dashboard.*
  if (isAdminPage || isDashboardAction || (isAdminApi && !isDeployCallback)) {
    try {
      const session = await auth.api.getSession({
        headers: context.request.headers,
      });

      if (!session || !session.user) {
        if (isAdminApi) return jsonError("Unauthorized", 401, corsHeaders);
        return context.redirect("/dashboard/login");
      }

      if (!isAdmin(session.user.email)) {
        if (isAdminApi) return jsonError("Forbidden", 403, corsHeaders);
        return context.redirect("/dashboard/login?error=unauthorized");
      }

      context.locals.user = session.user;
      context.locals.session = session.session;
    } catch (error) {
      console.error("Auth middleware error:", error);
      if (isAdminApi)
        return jsonError("Authentication error", 500, corsHeaders);
      return context.redirect("/dashboard/login");
    }
  }

  const response = await next();

  // Security headers for dynamic routes
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );

  // Admin Cache-Control:
  // - `no-store` would kill bfcache (back/forward = instant memory restore),
  //   and would also defeat Astro's prefetch reuse.
  // - Astro's <ClientRouter /> intercepts back/forward gestures and does its
  //   own `fetch()` — bfcache is bypassed entirely. So the only way to make
  //   back-nav instant is to let that fetch hit the browser's HTTP cache.
  // - A positive `max-age` enables that. Writes (in ProductForm, delete
  //   handlers) explicitly `fetch(url, { cache: 'reload' })` before
  //   navigating, so the cached response is always refreshed after a write.
  //   With that safeguard, single-admin usage has no real staleness risk.
  // - `must-revalidate` is kept so that after `max-age` elapses, browsers
  //   revalidate instead of serving stale.
  if (isAdminPage) {
    response.headers.set(
      "Cache-Control",
      "private, max-age=60, must-revalidate",
    );
  }

  // CORS: Add headers to API and action responses
  if (isApiRoute || isActionRoute) {
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
  }

  return response;
});
