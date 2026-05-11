import {
  SECRET_ADMIN_EMAILS,
  SECRET_BETTER_AUTH,
  PUBLIC_BETTER_AUTH_URL,
  PUBLIC_GOOGLE_CLIENT_ID,
  SECRET_GOOGLE_CLIENT,
} from "astro:env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index";
import * as schema from "../db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  baseURL: PUBLIC_BETTER_AUTH_URL,
  secret: SECRET_BETTER_AUTH,
  trustedOrigins: [
    "http://localhost:4321",
    "http://localhost:4322",
    PUBLIC_BETTER_AUTH_URL,
  ].filter((v, i, a) => a.indexOf(v) === i),
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    google: {
      clientId: PUBLIC_GOOGLE_CLIENT_ID,
      clientSecret: SECRET_GOOGLE_CLIENT,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 10 * 60,
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 20,
  },
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;

export function isAdmin(userEmail: string | undefined): boolean {
  if (!userEmail) return false;
  const allowed = SECRET_ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(userEmail.toLowerCase().trim());
}
