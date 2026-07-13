import { isAdmin } from "@/lib/auth";
import { buildVariationRows } from "@/lib/variations";
import { ActionError } from "astro:actions";

export function requireAdmin(locals: App.Locals) {
  if (!locals.user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in.",
    });
  }

  if (!isAdmin(locals.user.email)) {
    throw new ActionError({
      code: "FORBIDDEN",
      message: "You do not have access.",
    });
  }

  return locals.user;
}

export function variationRowsOrThrow(
  slug: string,
  volume: number,
  cakeVolume: number,
  submitted: { weight: number; price: number }[],
) {
  try {
    return buildVariationRows(slug, volume, cakeVolume, submitted);
  } catch (error) {
    throw new ActionError({
      code: "BAD_REQUEST",
      message:
        error instanceof Error
          ? error.message
          : "Введите цену для всех вариаций",
    });
  }
}
