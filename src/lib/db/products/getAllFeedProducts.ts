import { connect } from "@tursodatabase/serverless";
import { TURSO_DATABASE_URL, SECRET_TURSO_AUTH_TOKEN } from "astro:env/server";

const conn = connect({
  url: TURSO_DATABASE_URL,
  authToken: SECRET_TURSO_AUTH_TOKEN,
});

const stmt = await conn.prepare(`
  SELECT
    slug,
    name,
    price,
    json_extract(images, '$[0]') AS first_image,
    json_extract(images, '$[1]') AS second_image
    FROM products

`);
export const products = await stmt.all();
