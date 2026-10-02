export type SwipeOutcome = 'scroll' | 'spring' | 'delete';

export function swipeOutcome(dx: number, dy: number, width: number): SwipeOutcome {
  if (Math.abs(dy) > Math.abs(dx)) return 'scroll';
  return dx <= -width / 3 ? 'delete' : 'spring';
}
