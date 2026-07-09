import type { Alpine } from "alpinejs";

// Ephemeral (not persisted): a queue of "this cart line was removed because
// its variation no longer exists" notices, drained by the global modal.
// Populated by product-picker.ts's init-time stale check for whichever
// product happens to be rendered — see the "case scenarios" note there.

export type StaleNotice = {
  /** The removed cart line's id (variation id) — also used to de-duplicate. */
  id: string;
  productName: string;
  variationWeight: number;
  image: string;
};

export type StaleNoticeStore = {
  notices: StaleNotice[];
  push(notice: StaleNotice): void;
  clear(): void;
};

export function registerStaleNoticeStore(Alpine: Alpine) {
  const staleNoticeStore: StaleNoticeStore = {
    notices: [],

    push(notice: StaleNotice) {
      if (this.notices.some((n) => n.id === notice.id)) return;
      this.notices.push(notice);
    },

    clear() {
      this.notices = [];
    },
  };

  Alpine.store("staleNotices", staleNoticeStore);
}
