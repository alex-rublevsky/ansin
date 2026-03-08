/// <reference path="../node_modules/astro/astro-jsx.d.ts" />

declare module "astro/types" {
	export type HTMLTag = keyof astroHTML.JSX.DefinedIntrinsicElements;
	export type HTMLAttributes<Tag extends HTMLTag> =
		astroHTML.JSX.DefinedIntrinsicElements[Tag];
}
