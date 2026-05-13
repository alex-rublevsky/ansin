import { deleteProduct } from "@/db/dashboard/products/deleteProduct";
import { getProductImagesById } from "@/db/dashboard/products/getProductImagesById";
import { deleteProductImages } from "@/lib/storage";
import { ProductWorkflowError } from "./errors";

export async function deleteDashboardProduct(id: number): Promise<void> {
  const product = await getProductImagesById(id);

  if (!product) {
    throw new ProductWorkflowError("NOT_FOUND", "Товар не найден");
  }

  await deleteProduct(id);

  const images = product.images ?? [];
  if (images.length > 0) {
    await deleteProductImages(images).catch((e) =>
      console.error(
        `[products] Image cleanup failed for deleted product ${id}:`,
        e,
      ),
    );
  }
}
