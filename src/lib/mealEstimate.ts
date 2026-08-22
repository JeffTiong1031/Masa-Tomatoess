import type { Confidence, Portion } from '@/lib/meals';

export const PORTION_SMALLER = 0.7;
export const PORTION_LARGER = 1.4;

const MULTIPLIER: Record<Portion, number> = {
  smaller: PORTION_SMALLER,
  normal: 1,
  larger: PORTION_LARGER,
};

export function scaleForPortion(calories: number, portion: Portion): number {
  return Math.round(calories * MULTIPLIER[portion]);
}

export function needsManualEntry(confidence: Confidence): boolean {
  return confidence === 'low';
}
