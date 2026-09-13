export const BANNER_SWIPE_PX = 48;

export function nextIndex(index: number, length: number): number {
  if (length === 0) return 0;
  return (index + 1) % length;
}

export function prevIndex(index: number, length: number): number {
  if (length === 0) return 0;
  return (index - 1 + length) % length;
}

export function loopedCards<T>(cards: T[]): T[] {
  if (cards.length < 2) return cards;
  return [cards[cards.length - 1], ...cards, cards[0]];
}

export function loopHome(length: number): number {
  return length < 2 ? 0 : 1;
}

export function stepLoop(
  index: number,
  length: number,
  direction: 1 | -1,
): { index: number; snap: number | null } {
  if (length < 2) return { index: 0, snap: null };
  const next = index + direction;
  if (next < 1) return { index: 0, snap: length };
  if (next > length) return { index: length + 1, snap: 1 };
  return { index: next, snap: null };
}

export function snapLoop(index: number, length: number): number | null {
  if (length < 2) return null;
  if (index === 0) return length;
  if (index === length + 1) return 1;
  return null;
}

export function swipeDirection(dx: number, threshold: number): 1 | -1 | 0 {
  if (dx <= -threshold) return 1;
  if (dx >= threshold) return -1;
  return 0;
}
