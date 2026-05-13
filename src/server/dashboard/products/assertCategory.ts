import { categoryExists } from "@/db/dashboard/categories/categoryExists";
import { ProductWorkflowError } from "./errors";

export async function assertCategoryExists(
  categoryId: number | null,
): Promise<void> {
  if (categoryId === null) return;
  if (await categoryExists(categoryId)) return;

  throw new ProductWorkflowError("BAD_REQUEST", "Категория не найдена");
}
