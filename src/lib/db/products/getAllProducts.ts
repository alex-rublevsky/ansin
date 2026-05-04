import { connect } from "@tursodatabase/serverless";
import { TURSO_DATABASE_URL, SECRET_TURSO_AUTH_TOKEN } from "astro:env/server";

const conn = connect({
  url: TURSO_DATABASE_URL,
  authToken: SECRET_TURSO_AUTH_TOKEN,
});

const stmt = await conn.prepare(`
  SELECT
    id,
    slug,
    name,
    price,
    images,
    description
    FROM products
`);
export const products = (await stmt.all()).map((p) => ({
  ...p,
  images: JSON.parse(p.images),
}));
