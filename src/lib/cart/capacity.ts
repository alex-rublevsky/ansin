// Pure inventory math: how much of a product's shared weight pool is left,
// and what that means for a given variation. No UX/selection policy here —
// see ./selection for "what should be picked" heuristics.

import type { CartItem, VariationSnapshot } from "./types";

/** Total grams of this product already in the cart (all variations). */
export function weightInCart(
  cartItems: Record<string, CartItem>,
  productId: string,
): number {
  return Object.values(cartItems).reduce((total, item) => {
    if (item.productId !== productId) return total;
    return total + item.variationWeight * item.qty;
  }, 0);
}

export function remainingVolume(
  volume: number,
  cartItems: Record<string, CartItem>,
  productId: string,
): number {
  return Math.max(0, volume - weightInCart(cartItems, productId));
}

/** Variations that can fit at least once. Preserves input order (weight desc). */
export function availableVariations(
  variations: VariationSnapshot[],
  remaining: number,
): VariationSnapshot[] {
  return variations.filter((v) => v.weight > 0 && v.weight <= remaining);
}

export function maxQtyForVariation(weight: number, remaining: number): number {
  if (weight <= 0 || remaining <= 0) return 0;
  return Math.floor(remaining / weight);
}

/** Max qty for a cart line, excluding that line's own current usage. */
export function maxQtyForLine(
  line: Pick<CartItem, "id" | "productId" | "variationWeight" | "volume">,
  cartItems: Record<string, CartItem>,
): number {
  const others = Object.values(cartItems).reduce((total, item) => {
    if (item.productId !== line.productId) return total;
    if (item.id === line.id) return total;
    return total + item.variationWeight * item.qty;
  }, 0);

  return maxQtyForVariation(line.variationWeight, line.volume - others);
}

/**
 * Cart lines for a product whose variation no longer exists in the current
 * live variation list (e.g. removed/renamed in the dashboard since it was
 * added to the cart). Still counted in weightInCart — we can't know whether
 * its weight is still accurate, so we conservatively keep reserving it —
 * but callers should surface these so the user can remove them.
 */
export function staleLinesForProduct(
  cartItems: Record<string, CartItem>,
  productId: string,
  variations: VariationSnapshot[],
): CartItem[] {
  const liveIds = new Set(variations.map((v) => v.id));
  return Object.values(cartItems).filter(
    (item) => item.productId === productId && !liveIds.has(item.variationId),
  );
}
