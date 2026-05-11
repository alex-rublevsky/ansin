/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_BETTER_AUTH_URL: string;
  readonly SECRET_BETTER_AUTH: string;
  readonly PUBLIC_TURSO_DATABASE_URL: string;
  readonly SECRET_TURSO_AUTH_TOKEN: string;
  readonly PUBLIC_ASSETS_BASE_URL: string;
  readonly SECRET_ADMIN_EMAILS: string;
  readonly PUBLIC_GOOGLE_CLIENT_ID: string;
  readonly SECRET_GOOGLE_CLIENT: string;
  readonly PUBLIC_YANDEX_STORAGE_BUCKET: string;
  readonly SECRET_YANDEX_STORAGE_ACCESS_KEY: string;
  readonly SECRET_YANDEX_STORAGE_KEY: string;
  readonly PUBLIC_YANDEX_STORAGE_REGION: string;
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
