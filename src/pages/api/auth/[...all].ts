import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { json } from "@/lib/api/json";

export const prerender = false;

export const ALL: APIRoute = async (ctx) => {
  try {
    return await auth.handler(ctx.request);
  } catch (error) {
    console.error("Auth handler error:", error);
    return json({ error: "Authentication error" }, 500);
  }
};
