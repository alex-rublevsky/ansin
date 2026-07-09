import type { Alpine } from "alpinejs";

export function registerStaleVariationModal(Alpine: Alpine) {
  Alpine.data("staleVariationModal", () => ({
    get store() {
      return (this as unknown as { $store: import("alpinejs").Stores })
        .$store;
    },

    get dialog() {
      return (this as unknown as { $refs: Record<string, HTMLDialogElement> })
        .$refs.dialog;
    },

    get notices() {
      return this.store.staleNotices.notices;
    },

    get hasNotices() {
      return this.notices.length > 0;
    },

    /** Opens/closes to match queue state — one <dialog> shared across every product picker on the page. */
    syncOpenState() {
      const dialog = this.dialog;
      if (!dialog) return;

      if (this.hasNotices) {
        if (!dialog.open) {
          dialog.showModal();
          // Without this, the browser auto-focuses the "Продолжить" button,
          // which shows its focus ring the instant the dialog opens. Focusing
          // the (tabindex="-1") dialog itself keeps the ring from appearing
          // until the user actually tabs to the button.
          dialog.focus();
        }
      } else if (dialog.open) {
        dialog.close();
      }
    },

    /** Lines stay in the cart (still counted against the volume pool) until this is called. */
    acknowledge() {
      for (const notice of this.notices) {
        this.store.cart.remove(notice.id);
      }
      this.store.staleNotices.clear();
    },
  }));
}
