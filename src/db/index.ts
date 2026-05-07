import { drizzle } from "drizzle-orm/libsql";
import { TURSO_DATABASE_URL, SECRET_TURSO_AUTH_TOKEN } from "astro:env/server";

import * as schema from "./schema";

export const db = drizzle({
  connection: {
    url: TURSO_DATABASE_URL,
    authToken: SECRET_TURSO_AUTH_TOKEN,
  },
  schema,
});
