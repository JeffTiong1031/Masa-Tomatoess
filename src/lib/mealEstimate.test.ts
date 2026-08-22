import { describe, expect, it } from 'vitest';
import {
  PORTION_LARGER,
  PORTION_SMALLER,
  needsManualEntry,
  scaleForPortion,
} from './mealEstimate';

describe('portion multipliers', () => {
  it('pins smaller at 0.7', () => {
    expect(PORTION_SMALLER).toBe(0.7);
  });

  it('pins larger at 1.4', () => {
    expect(PORTION_LARGER).toBe(1.4);
  });
});

describe('scaleForPortion', () => {
  it('leaves a normal portion untouched', () => {
    expect(scaleForPortion(620, 'normal')).toBe(620);
  });

  it('scales down for a smaller portion', () => {
    expect(scaleForPortion(600, 'smaller')).toBe(420);
  });

  it('scales up for a larger portion', () => {
    expect(scaleForPortion(600, 'larger')).toBe(840);
  });

  it('rounds to a whole calorie', () => {
    expect(scaleForPortion(625, 'smaller')).toBe(438);
  });

  it('keeps zero at zero', () => {
    expect(scaleForPortion(0, 'larger')).toBe(0);
  });
});

describe('needsManualEntry', () => {
  it('is true only for low confidence', () => {
    expect(needsManualEntry('low')).toBe(true);
    expect(needsManualEntry('medium')).toBe(false);
    expect(needsManualEntry('high')).toBe(false);
  });
});
