import { describe, expect, it } from 'vitest';
import { linkCardPlacement } from './noteLinkCard';

describe('linkCardPlacement', () => {
  it('sits the card under the address in a tall maximised pad, not at the bottom', () => {
    const pad = { top: 0, left: 0, width: 800, height: 900 };
    const link = { top: 80, left: 24, width: 200, height: 24 };
    const card = { width: 384, height: 96 };
    expect(linkCardPlacement(pad, link, card, 8)).toEqual({
      top: 112,
      left: 24,
    });
  });

  it('moves above the address when there is no room below', () => {
    const pad = { top: 0, left: 0, width: 360, height: 300 };
    const link = { top: 250, left: 16, width: 180, height: 24 };
    const card = { width: 280, height: 44 };
    expect(linkCardPlacement(pad, link, card, 8)).toEqual({
      top: 198,
      left: 16,
    });
  });
});
