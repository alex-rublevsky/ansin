import type { ActionErrorCode } from "astro:actions";

export class ProductWorkflowError extends Error {
  constructor(
    public readonly code: ActionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProductWorkflowError";
  }
}
