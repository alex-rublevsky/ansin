// @ts-check
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import { defineConfig, envField, fontProviders } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://ansin.ru",
  integrations: [icon(), sitemap()],
  output: "server",
  env: {
    schema: {
      // TODO: update these variable examples
      SECRET_BETTER_AUTH: envField.string({
        context: "server",
        access: "secret",
      }),
      TURSO_DATABASE_URL: envField.string({
        //TODO: should this be set to client?
        context: "server",
        access: "public",
      }),
      SECRET_TURSO_AUTH_TOKEN: envField.string({
        context: "server",
        access: "secret",
      }),
      PUBLIC_ASSETS_BASE_URL: envField.string({
        context: "client",
        access: "public",
        default: "https://storage.yandexcloud.net/ansin-static/",
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
