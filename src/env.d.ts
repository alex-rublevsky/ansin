/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare module "astro/jsx-runtime";

interface ImportMetaEnv {
	readonly YANDEX_STORAGE_BUCKET: string;
	readonly YANDEX_STORAGE_ACCESS_KEY: string;
	readonly YANDEX_STORAGE_SECRET_KEY: string;
	readonly YANDEX_STORAGE_REGION: string;
	readonly TURSO_DATABASE_URL: string;
	readonly TURSO_AUTH_TOKEN: string;
	readonly BETTER_AUTH_SECRET: string;
	readonly BETTER_AUTH_URL: string;
	readonly GOOGLE_CLIENT_ID: string;
	readonly GOOGLE_CLIENT_SECRET: string;
	readonly RESEND_API_KEY: string;
	readonly ADMIN_EMAILS: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare namespace App {
	interface Locals {
		session: import("./lib/auth").Session | null;
		user: import("./lib/auth").User | null;
	}
}
