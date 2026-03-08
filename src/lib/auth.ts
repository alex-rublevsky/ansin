import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDB } from "../db/client";
import * as schema from "../db/schema";

let _auth: ReturnType<typeof betterAuth> | null = null;

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export function getAuth() {
	if (!_auth) {
		_auth = betterAuth({
			database: drizzleAdapter(getDB(), {
				provider: "sqlite",
				schema: {
					user: schema.users,
					session: schema.sessions,
					account: schema.accounts,
					verification: schema.verifications,
				},
			}),
			baseURL: process.env.BETTER_AUTH_URL || "http://localhost:4321",
			secret: requireEnv("BETTER_AUTH_SECRET"),
			trustedOrigins: [
				"http://localhost:4321",
				process.env.BETTER_AUTH_URL,
			].filter(Boolean) as string[],
			emailAndPassword: {
				enabled: false,
			},
			socialProviders: {
				google: {
					clientId: process.env.GOOGLE_CLIENT_ID || "",
					clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
				},
			},
			rateLimit: {
				enabled: true,
				window: 60,
				max: 60,
			},
		});
	}
	return _auth;
}

export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
	get(_target, prop) {
		return getAuth()[prop as keyof ReturnType<typeof betterAuth>];
	},
});

export type Session = ReturnType<
	typeof getAuth
>["$Infer"]["Session"]["session"];
export type User = ReturnType<typeof getAuth>["$Infer"]["Session"]["user"];

export function isAdmin(
	userEmail: string | undefined,
	adminEmails: string | undefined,
): boolean {
	if (!userEmail || !adminEmails) {
		return false;
	}
	const allowed = adminEmails
		.split(",")
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
	return allowed.includes(userEmail.toLowerCase().trim());
}

export function requireAdmin(locals: App.Locals): Response | null {
	if (!locals.user) {
		return new Response(
			JSON.stringify({ error: "Unauthorized - authentication required" }),
			{
				status: 401,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	if (!isAdmin(locals.user.email, process.env.ADMIN_EMAILS)) {
		return new Response(
			JSON.stringify({ error: "Forbidden - admin access required" }),
			{
				status: 403,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	return null;
}
