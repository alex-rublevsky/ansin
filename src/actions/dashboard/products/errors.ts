import { ActionError } from "astro:actions";
import { ProductWorkflowError } from "@/server/dashboard/products/errors";

export function toProductActionError(err: unknown): ActionError {
  if (err instanceof ProductWorkflowError) {
    return new ActionError({
      code: err.code,
      message: err.message,
    });
  }

  return new ActionError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Не удалось выполнить действие. Попробуйте снова.",
  });
}
