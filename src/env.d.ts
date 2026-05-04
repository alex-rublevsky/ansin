interface ImportMetaEnv {
  readonly SECRET_BETTER_AUTH: string;
  readonly TURSO_DATABASE_URL: string;
  readonly SECRET_TURSO_AUTH_TOKEN: string;
  readonly PUBLIC_ASSETS_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
