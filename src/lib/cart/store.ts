import persist from "@alpinejs/persist";
import type { Alpine } from "alpinejs";

import { maxQtyForLine, remainingVolume } from "./capacity";
import type { CartItem, ProductItem } from "./types";

export type CartStore = {
  cartItems: Record<string, CartItem>;
  readonly cartItemsCount: number;
  readonly subtotal: number;
  qtyFor(id: string): number;
  remainingVolumeFor(productId: string, volume: number): number;
  add(line: ProductItem, delta: number): void;
  addQty(line: ProductItem, qty: number): void;
  setQty(id: string, qty: number, line?: ProductItem): void;
  remove(id: string): void;
};

export function registerCartStore(Alpine: Alpine) {
  Alpine.plugin(persist);

  const cartStore: CartStore = {
    cartItems: Alpine.$persist({}) as unknown as CartStore["cartItems"],

    get cartItemsCount() {
      return Object.values(this.cartItems).reduce(
        (acc, item) => acc + item.qty,
        0,
      );
    },

    get subtotal() {
      return Object.values(this.cartItems).reduce(
        (acc, item) => acc + item.price * item.qty,
        0,
      );
    },

    qtyFor(id: string) {
      return this.cartItems[id]?.qty ?? 0;
    },

    remainingVolumeFor(productId: string, volume: number) {
      return remainingVolume(volume, this.cartItems, productId);
    },

    add(line: ProductItem, delta: number) {
      const { id } = line;
      const cart = this.cartItems;

      if (delta > 0) {
        const maxQty = maxQtyForLine(line, cart);
        const currentQty = cart[id]?.qty ?? 0;
        const allowedDelta = maxQty - currentQty;
        if (allowedDelta <= 0) return;
        delta = Math.min(delta, allowedDelta);
      }

      if (!cart[id]) {
        if (delta <= 0) return;
        cart[id] = { ...line, qty: 0 };
      }

      const next = cart[id].qty + delta;
      if (next <= 0) {
        delete cart[id];
      } else {
        cart[id].qty = next;
      }
    },

    addQty(line: ProductItem, qty: number) {
      if (qty <= 0) return;
      this.add(line, qty);
    },

    setQty(id: string, qty: number, line?: ProductItem) {
      const item = line ?? this.cartItems[id];
      if (!item) return;

      const maxQty = maxQtyForLine(item, this.cartItems);
      const next = Math.min(maxQty, Math.max(0, Math.floor(Number(qty) || 0)));

      if (next <= 0) {
        delete this.cartItems[id];
        return;
      }

      if (!this.cartItems[id]) {
        this.cartItems[id] = { ...item, id, qty: next };
      } else {
        this.cartItems[id].qty = next;
      }
    },

    remove(id: string) {
      delete this.cartItems[id];
    },
  };

  Alpine.store("cart", cartStore);
}
