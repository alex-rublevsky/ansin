import { drizzle } from "drizzle-orm/libsql";
import { relations } from "@/db/relations";
import {
  PUBLIC_TURSO_DATABASE_URL,
  SECRET_TURSO_AUTH_TOKEN,
} from "astro:env/server";

import * as schema from "./schema";

export const db = drizzle({
  relations,
  connection: {
    url: PUBLIC_TURSO_DATABASE_URL,
    authToken: SECRET_TURSO_AUTH_TOKEN,
  },
  schema,
});
