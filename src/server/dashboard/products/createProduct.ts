import { db } from "@/db";
import { insertProduct } from "@/db/dashboard/products/insertProduct";
import { replaceProductVariations } from "@/db/dashboard/variations/replaceProductVariations";
import type { Product } from "@/db/schema";
import type { ProductInput } from "@/lib/schemas/product";
import { generateSlug } from "@/lib/slug";
import { deleteProductImages } from "@/lib/storage";
import { assertCategoryExists } from "./assertCategory";
import { assertSlugAvailable } from "./assertSlugAvailable";
import { ProductWorkflowError } from "./errors";
import { finalizeProductImages } from "./finalizeProductImages";
import { rollbackMovedImages } from "./imagePaths";

export async function createDashboardProduct(
  input: ProductInput,
): Promise<Product> {
  const slug = generateSlug(input.name);

  await assertCategoryExists(input.categoryId);
  await assertSlugAvailable(slug);

  const { finalImages, newlyMovedPaths, copiedStagingPaths } =
    await finalizeProductImages(input.images, slug);

  try {
    const product = await db.transaction(async (tx) => {
      const p = await insertProduct(
        {
          name: input.name,
          description: input.description,
          price: 0,
          slug,
          volume: input.volume,
          cakeVolume: input.cakeVolume,
          isActive: input.isActive,
          categoryId: input.categoryId,
          images: finalImages,
        },
        tx,
      );

      await replaceProductVariations(
        p.id,
        input.variations.map((v) => ({
          weight: v.weight,
          price: v.price,
          sku: `${slug}-${v.weight}g`,
        })),
        tx,
      );

      return p;
    });

    if (copiedStagingPaths.length > 0) {
      await deleteProductImages(copiedStagingPaths).catch((e) =>
        console.error("[products] Staging cleanup failed:", e),
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
