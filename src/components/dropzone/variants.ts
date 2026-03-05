import { tv } from "tailwind-variants";

export const dropzone = tv({
	base: ["image-upload-container"],
});

export const dropzoneFilesList = tv({
	base: [
		"starwind-files-list",
		"mt-1 -mb-8 min-h-8",
		"bg-muted invisible flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1 text-sm",
		"[&_div]:flex [&_div]:items-center [&_div]:gap-1 [&_svg]:size-3.5",
	],
});
