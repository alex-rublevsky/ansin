import type { Alpine } from "alpinejs";

import { availableVariations, maxQtyForVariation, staleLinesForProduct } from "./cart/capacity";
import { nextSelectedWeight, resolveSelectedWeight } from "./cart/selection";
import { toCartLine, type VariationSnapshot } from "./cart/types";

/**
 * "quickAdd" — card grid: always adds exactly 1 unit, no visible qty stepper.
 * "configurable" — product detail page: user picks a quantity before adding.
 */
export type ProductPickerMode = "quickAdd" | "configurable";

export type ProductPickerInit = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  volume: number;
  variations: VariationSnapshot[];
  mode?: ProductPickerMode;
};

export function toProductPickerInit(
  product: {
    id: string | number;
    slug: string;
    name: string;
    image: string;
    volume: number;
    variations: VariationSnapshot[];
  },
  options: { mode?: ProductPickerMode } = {},
): ProductPickerInit {
  return {
    productId: String(product.id),
    slug: product.slug,
    name: product.name,
    image: product.image,
    volume: product.volume,
    variations: product.variations.map((v) => ({
      id: v.id,
      weight: v.weight,
      price: v.price,
    })),
    mode: options.mode ?? "configurable",
  };
}

export function registerProductPicker(Alpine: Alpine) {
  Alpine.data("productPicker", (init: ProductPickerInit) => ({
    productId: init.productId,
    slug: init.slug,
    name: init.name,
    image: init.image,
    volume: init.volume,
    variations: init.variations,
    mode: init.mode ?? "configurable",

    selectedWeight: null as number | null,
    quantity: 1,

    init() {
      // Variations are a static prop snapshot for this page load, so a single
      // check at mount time is enough — no need to re-run this reactively.
      this.flagStaleCartLines();

      this.selectedWeight = resolveSelectedWeight(
        this.variations,
        this.remainingVolume,
      );
    },

    /** Single point of contact with the global stores — every other getter/method reads through here. */
    get cart() {
      return (this as unknown as { $store: import("alpinejs").Stores }).$store
        .cart;
    },

    get staleNotices() {
      return (this as unknown as { $store: import("alpinejs").Stores }).$store
        .staleNotices;
    },

    /**
     * Cart lines for this product whose variation no longer exists
     * (removed/replaced since being added). Left in the cart — still counted
     * against the volume pool — until the user acknowledges the global
     * stale-variation modal, which is what actually removes them. If they
     * navigate away/refresh without acknowledging, this re-flags them next
     * time this product's picker mounts.
     */
    flagStaleCartLines() {
      const stale = staleLinesForProduct(
        this.cart.cartItems,
        this.productId,
        this.variations,
      );

      for (const item of stale) {
        this.staleNotices.push({
          id: item.id,
          productName: this.name,
          variationWeight: item.variationWeight,
          image: item.image,
        });
      }
    },

    get remainingVolume() {
      return this.cart.remainingVolumeFor(this.productId, this.volume);
    },

    get availableVariations() {
      return availableVariations(this.variations, this.remainingVolume);
    },

    get availableWeights() {
      return this.availableVariations.map((v) => v.weight);
    },

    /** User preference, falling back when cart volume makes it unavailable. */
    get effectiveWeight() {
      return resolveSelectedWeight(
        this.variations,
        this.remainingVolume,
        this.selectedWeight,
      );
    },

    get selectedVariation() {
      const weight = this.effectiveWeight;
      if (weight == null) return null;
      return this.variations.find((v) => v.weight === weight) ?? null;
    },

    get cartLine() {
      const variation = this.selectedVariation;
      if (!variation) return null;

      return toCartLine(
        {
          id: this.productId,
          slug: this.slug,
          name: this.name,
          image: this.image,
          volume: this.volume,
        },
        variation,
      );
    },

    get maxQuantity() {
      const weight = this.effectiveWeight;
      if (weight == null) return 0;
      return maxQtyForVariation(weight, this.remainingVolume);
    },

    /** How many units an "add to cart" click should add — the one place mode matters. */
    get quantityToAdd() {
      return this.mode === "quickAdd" ? 1 : this.quantity;
    },

    get canAdd() {
      return this.maxQuantity > 0 && this.quantityToAdd > 0;
    },

    get displayPrice() {
      return this.selectedVariation?.price ?? 0;
    },

    isSelected(weight: number) {
      return Number(this.effectiveWeight) === Number(weight);
    },

    selectWeight(weight: number) {
      if (!this.availableWeights.includes(Number(weight))) return;
      this.selectedWeight = weight;
      this.clampQuantity();
    },

    clampQuantity() {
      const max = this.maxQuantity;
      if (max <= 0) {
        this.quantity = 1;
        return;
      }
      this.quantity = Math.min(Math.max(this.quantity, 1), max);
    },

    addToCart() {
      const line = this.cartLine;
      if (!line || !this.canAdd) return;

      this.cart.addQty(line, this.quantityToAdd);

      this.selectedWeight = nextSelectedWeight(
        this.variations,
        this.selectedWeight,
        this.remainingVolume,
      );
      this.clampQuantity();
    },
  }));
}
