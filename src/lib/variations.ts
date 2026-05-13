/**
 * Generate the ordered list of weight steps (in grams) for a product's variation table.
 *
 * Fixed steps: 25, 50, 100, 200.
 * - cakeVolume > 0 (cake mode): use cakeVolume as the ceiling; add it as the final step.
 * - cakeVolume = 0 (free mode): continue in 100 g increments from 300 up to volume,
 *   then append the exact volume if it isn't already the last step.
 */
export function generateWeightSteps(
  volume: number,
  cakeVolume: number = 0,
): number[] {
  if (volume <= 0) return [];

  const ceiling = cakeVolume > 0 ? cakeVolume : volume;
  const steps: number[] = [];

  for (const w of [25, 50, 100, 200]) {
    if (w <= ceiling) steps.push(w);
  }

  if (cakeVolume > 0) {
    if (cakeVolume > 200) steps.push(cakeVolume);
  } else {
    for (let w = 300; w <= volume; w += 100) {
      steps.push(w);
    }
    const last = steps[steps.length - 1];
    if (last !== volume) steps.push(volume);
  }

  return [...new Set(steps)].sort((a, b) => a - b);
}
