import { db } from "@/db";
import { getProductImagesById } from "@/db/dashboard/products/getProductImagesById";
import { updateProduct } from "@/db/dashboard/products/updateProduct";
import { replaceProductVariations } from "@/db/dashboard/variations/replaceProductVariations";
import type { Product } from "@/db/schema";
import type { ProductInput } from "@/lib/schemas/product";
import { generateSlug } from "@/lib/slug";
import { deleteProductImages } from "@/lib/storage";
import { assertCategoryExists } from "./assertCategory";
import { assertSlugAvailable } from "./assertSlugAvailable";
import { ProductWorkflowError } from "./errors";
import { finalizeProductImages } from "./finalizeProductImages";
import { getRemovedImagePaths, rollbackMovedImages } from "./imagePaths";

export type UpdateDashboardProductInput = ProductInput & {
  id: number;
};

export async function updateDashboardProduct(
  input: UpdateDashboardProductInput,
): Promise<Product> {
  const { id, ...data } = input;
  const slug = generateSlug(data.name);

  await assertCategoryExists(data.categoryId);
  await assertSlugAvailable(slug, id);

  const existingProduct = await getProductImagesById(id);
  if (!existingProduct) {
    throw new ProductWorkflowError("NOT_FOUND", "Товар не найден");
  }

  const { finalImages, newlyMovedPaths, copiedStagingPaths } =
    await finalizeProductImages(data.images, slug);

  try {
    const product = await db.transaction(async (tx) => {
      const p = await updateProduct(
        id,
        {
          name: data.name,
          description: data.description,
          price: 0,
          slug,
          volume: data.volume,
          cakeVolume: data.cakeVolume,
          isActive: data.isActive,
          categoryId: data.categoryId,
          images: finalImages,
        },
        tx,
      );

      if (!p) {
        throw new ProductWorkflowError("NOT_FOUND", "Товар не найден");
      }

      await replaceProductVariations(
        id,
        data.variations.map((v) => ({
          weight: v.weight,
          price: v.price,
          sku: `${slug}-${v.weight}g`,
        })),
        tx,
      );

      return p;
    });

    const removedImages = getRemovedImagePaths(
      existingProduct.images,
      finalImages,
    );
    const cleanupPaths = [...removedImages, ...copiedStagingPaths];
    if (cleanupPaths.length > 0) {
      await deleteProductImages(cleanupPaths).catch((e) =>
        console.error(
          `[products] Image cleanup failed after updating product ${id}:`,
          e,
        ),
      );
    }

    return product;
  } catch (err) {
    await rollbackMovedImages(newlyMovedPaths);
    if (err instanceof ProductWorkflowError) throw err;
    throw new ProductWorkflowError(
      "INTERNAL_SERVER_ERROR",
      "Не удалось сохранить товар. Попробуйте снова.",
    );
  }
}
