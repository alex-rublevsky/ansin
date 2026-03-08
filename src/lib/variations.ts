export interface GeneratedVariation {
	weight: number;
	price: number;
	sku: string;
}

/**
 * Generate weight steps for a given total weight.
 * - 25g increments from 25 to 100 (25, 50, 75, 100)
 * - 50g increments from 100 to 200 (150, 200)
 * - 100g increments from 200+ (300, 400, ...)
 *
 * Smart system: minimizes variation count while still capturing the exact total weight.
 * E.g. if total is 113g, we include 113 instead of rounding to 100.
 */
export function generateWeightSteps(totalWeight: number): number[] {
	if (totalWeight <= 0) return [];

	const steps: number[] = [];

	// Phase 1: 25g increments from 25 to min(100, totalWeight)
	for (let w = 25; w <= Math.min(100, totalWeight); w += 25) {
		steps.push(w);
	}

	// Phase 2: 50g increments from 150 to min(200, totalWeight)
	for (let w = 150; w <= Math.min(200, totalWeight); w += 50) {
		steps.push(w);
	}

	// Phase 3: 100g increments from 300 to totalWeight
	for (let w = 300; w <= totalWeight; w += 100) {
		steps.push(w);
	}

	// Ensure the exact total weight is always included as the last step
	// (replace the closest step if it's within the same tier, or add it)
	const lastStep = steps[steps.length - 1];
	if (lastStep !== totalWeight && totalWeight > 0) {
		// If last step is close but not exact, replace it
		// "Close" means it's in the same tier increment range
		if (lastStep && lastStep < totalWeight) {
			steps.push(totalWeight);
		} else if (!lastStep) {
			steps.push(totalWeight);
		}
	}

	// Deduplicate and sort
	return [...new Set(steps)].sort((a, b) => a - b);
}

/**
 * Calculate the price markup multiplier for smaller quantities.
 * Applies a graduated markup from 20% (at 25g) down to ~10% (at 200g).
 * Quantities above 200g get no markup.
 */
export function getSmallQuantityMultiplier(weight: number): number {
	if (weight > 200) return 1.0;

	// Linear interpolation: 25g -> 1.20, 200g -> 1.10
	const minWeight = 25;
	const maxWeight = 200;
	const maxMarkup = 1.2;
	const minMarkup = 1.1;

	const t = Math.min(
		1,
		Math.max(0, (weight - minWeight) / (maxWeight - minWeight)),
	);
	return maxMarkup - t * (maxMarkup - minMarkup);
}

/**
 * Generate variations for a product.
 *
 * @param pricePer100g - Price per 100 grams
 * @param totalWeight - Total weight of the product in grams
 * @param productSlug - Product slug for SKU generation
 * @param priceUp - Whether smaller quantities have a per-gram markup
 */
export function generateVariations(
	pricePer100g: number,
	totalWeight: number,
	productSlug: string,
	priceUp: boolean = true,
): GeneratedVariation[] {
	const steps = generateWeightSteps(totalWeight);
	const basePricePerGram = pricePer100g / 100;

	const maxWeight = steps[steps.length - 1];

	return steps.map((weight) => {
		let pricePerGram = basePricePerGram;

		// Never mark up the biggest variation
		if (priceUp && weight < maxWeight) {
			pricePerGram *= getSmallQuantityMultiplier(weight);
		}

		const rawPrice = pricePerGram * weight;
		// Round to nearest whole ruble
		const price = Math.round(rawPrice);

		return {
			weight,
			price,
			sku: `${productSlug}-${weight}g`,
		};
	});
}
