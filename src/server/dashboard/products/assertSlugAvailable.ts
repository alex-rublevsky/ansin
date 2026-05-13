import { findProductSlugConflict } from "@/db/dashboard/products/slugConflict";
import { ProductWorkflowError } from "./errors";

export async function assertSlugAvailable(
  slug: string,
  exceptProductId?: number,
): Promise<void> {
  const conflict = await findProductSlugConflict(slug, exceptProductId);
  if (!conflict) return;

  throw new ProductWorkflowError(
    "CONFLICT",
    "Ярлык уже занят другим товаром",
  );
}
