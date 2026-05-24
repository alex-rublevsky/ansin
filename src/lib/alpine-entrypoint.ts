import type { Alpine } from "alpinejs";
import { registerCartDrawerData } from "@/lib/cartDrawerData";
import { registerCartStore } from "@/lib/cartStore";
import { registerProductFilterStore } from "@/lib/productFilterData";
import { registerProductSelectionData } from "@/lib/productSelectionData";

export default (Alpine: Alpine) => {
  registerCartStore(Alpine);
  registerCartDrawerData(Alpine);
  registerProductFilterStore(Alpine);
  registerProductSelectionData(Alpine);
};
