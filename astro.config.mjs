// @ts-check
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import { defineConfig, envField, fontProviders } from "astro/config";

import alpinejs from "@astrojs/alpinejs";

// https://astro.build/config
export default defineConfig({
  site: "https://ansintea.com",
  integrations: [
    icon(),
    sitemap({filter: (page) => !page.startsWith("https://ansintea.com/dashboard/"),}),
    alpinejs({ entrypoint: "/src/lib/alpine-entrypoint" }),
  ],
  output: "server",
  security: {
    // Astro's built-in CSRF origin check compares the Origin header against `site`.
    // Behind the API Gateway (and later the CDN) the proxy rewrites the Host header,
    // making the check fail for legitimate requests. Auth and route protection are
    // handled instead by the Better Auth middleware and per-route guards.
    checkOrigin: false,
  },
  env: {
    schema: {
      SECRET_BETTER_AUTH: envField.string({
        context: "server",
        access: "secret",
      }),
      PUBLIC_BETTER_AUTH_URL: envField.string({
        context: "server",
        access: "public",
      }),
      SECRET_ADMIN_EMAILS: envField.string({
        context: "server",
        access: "secret",
      }),
      PUBLIC_GOOGLE_CLIENT_ID: envField.string({
        context: "server",
        access: "public",
      }),
      SECRET_GOOGLE_CLIENT: envField.string({
        context: "server",
        access: "secret",
      }),
      PUBLIC_TURSO_DATABASE_URL: envField.string({
        context: "server",
        access: "public",
      }),
      SECRET_TURSO_AUTH_TOKEN: envField.string({
        context: "server",
        access: "secret",
      }),
      PUBLIC_YANDEX_STORAGE_BUCKET: envField.string({
        context: "server",
        access: "public",
      }),
      SECRET_YANDEX_STORAGE_ACCESS_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
      SECRET_YANDEX_STORAGE_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
      PUBLIC_YANDEX_STORAGE_REGION: envField.string({
        context: "server",
        access: "public",
      }),
    },
  },
  adapter: node({
    mode: "standalone",
  }),
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Overused Grotesk",
      cssVariable: "--font-overused-grotesk",
      options: {
        variants: [
          {
            weight: "300 900",
            style: "normal",
            src: ["./src/assets/fonts/OverusedGrotesk.woff2"],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Kazuki Reiwa",
      cssVariable: "--font-kazuki-reiwa",
      options: {
        variants: [
          {
            weight: "200",
            style: "normal",
            src: ["./src/assets/fonts/KazukiReiwa-Light-subset.woff2"],
          },
          {
            weight: "400",
            style: "normal",
            src: ["./src/assets/fonts/KazukiReiwa-Regular-subset.woff2"],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Long Cang",
      cssVariable: "--font-long-cang",
      options: {
        variants: [
          {
            weight: "200",
            style: "normal",
            src: ["./src/assets/fonts/LongCang-Regular-subset.woff2"],
          },
        ],
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    concurrency: 8,
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  image: {
    domains: ["storage.yandexcloud.net"],
  },
});
