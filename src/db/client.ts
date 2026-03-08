import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle> | null = null;
let _tursoClient: ReturnType<typeof createClient> | null = null;

export function getDB() {
	if (!_db) {
		_tursoClient = createClient({
			url:
				import.meta.env.TURSO_DATABASE_URL ||
				process.env.TURSO_DATABASE_URL ||
				"file:local.db",
			authToken:
				import.meta.env.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
		});
		_db = drizzle(_tursoClient, { schema });
	}
	return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
	get(_target, prop) {
		return getDB()[prop as keyof ReturnType<typeof drizzle>];
	},
});
