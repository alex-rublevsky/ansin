import type { CartItem } from "@/lib/cart/types";
import type { OrderItem } from "@/db/schema";

/** Snapshot a cart line into the shape stored on an order. */
export function toOrderItem(item: CartItem): OrderItem {
  return {
    productId: Number(item.productId),
    variationId: item.variationId,
    productName: item.name,
    slug: item.slug,
    image: item.image,
    ...(item.categoryName ? { categoryName: item.categoryName } : {}),
    variationWeight: item.variationWeight,
    quantity: item.qty,
    price: item.price,
  };
}
