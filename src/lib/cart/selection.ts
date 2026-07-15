// UX policy for which variation should be selected/highlighted. Deliberately
// separate from ./capacity: these are fallback heuristics, not inventory math.

import { availableVariations } from "./capacity";
import type { VariationSnapshot } from "./types";

/** Default storefront selection when the user hasn't picked a weight yet. */
const DEFAULT_WEIGHT = 100;

/** Pick preferred weight, else 100g, else largest available; null when nothing fits. */
export function resolveSelectedWeight(
  variations: VariationSnapshot[],
  remaining: number,
  prefer?: number | null,
): number | null {
  const available = availableVariations(variations, remaining);
  if (available.length === 0) return null;

  if (prefer != null && available.some((v) => v.weight === prefer)) {
    return prefer;
  }

  if (available.some((v) => v.weight === DEFAULT_WEIGHT)) {
    return DEFAULT_WEIGHT;
  }

  return Math.max(...available.map((v) => v.weight));
}

/** After add: keep current if still available, else next in list order that fits. */
export function nextSelectedWeight(
  variations: VariationSnapshot[],
  current: number | null,
  remaining: number,
): number | null {
  const available = availableVariations(variations, remaining);
  if (available.length === 0) return null;

  if (current != null && available.some((v) => v.weight === current)) {
    return current;
  }

  if (current != null) {
    const currentIndex = variations.findIndex((v) => v.weight === current);
    if (currentIndex >= 0) {
      for (let i = currentIndex + 1; i < variations.length; i++) {
        const candidate = variations[i].weight;
        if (available.some((v) => v.weight === candidate)) {
          return candidate;
        }
      }
    }
  }

  return available[0].weight;
}
