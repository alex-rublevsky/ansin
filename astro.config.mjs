// @ts-check
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	site: "https://d5dlmoeh5bvrbgn8dnuv.akta928u.apigw.yandexcloud.net",
	output: "server",
	security: {
		checkOrigin: false, // Handled in middleware instead — Astro's built-in check can't work behind API Gateway proxy
	},
	adapter: node({
		mode: "standalone",
	}),
	vite: {
		plugins: [tailwindcss()],
	},
	image: {
		domains: ["storage.yandexcloud.net"],
	},
	prefetch: {
		prefetchAll: true,
	},
});
