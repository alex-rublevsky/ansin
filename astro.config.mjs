// @ts-check
import { defineConfig, envField, fontProviders } from "astro/config";

import node from "@astrojs/node";

import icon from "astro-icon";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://ansin.ru",

  env: {
    schema: {
      // TODO: update these variable examples
      SECRET_BETTER_AUTH: envField.string({
        context: "server",
        access: "secret",
      }),
    },
  },

  adapter: node({
    mode: "standalone",
  }),

  integrations: [icon()],

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
});
