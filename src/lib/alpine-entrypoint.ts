import type { Alpine } from "alpinejs";

import { registerCartStore } from "./cart/store";
import { registerStaleNoticeStore } from "./cart/staleNotices";
import { registerProductPicker } from "./product-picker";
import { registerStaleVariationModal } from "./stale-variation-modal";

export type { CartItem, ProductItem } from "./cart/types";
export type { CartStore } from "./cart/store";
export type { StaleNoticeStore, StaleNotice } from "./cart/staleNotices";

export default (Alpine: Alpine) => {
  registerCartStore(Alpine);
  registerStaleNoticeStore(Alpine);
  registerProductPicker(Alpine);
  registerStaleVariationModal(Alpine);
};
