export const LINK_CARD_GAP = 8;

export type LinkCardBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function linkCardPlacement(
  pad: LinkCardBox,
  link: LinkCardBox,
  card: { width: number; height: number },
  gap: number,
): { top: number; left: number } {
  const linkTop = link.top - pad.top;
  const linkBottom = linkTop + link.height;
  let top = linkBottom + gap;
  if (top + card.height > pad.height) {
    top = linkTop - gap - card.height;
  }
  if (top < 0) {
    top = 0;
  }
  if (top + card.height > pad.height) {
    top = Math.max(0, pad.height - card.height);
  }

  let left = link.left - pad.left;
  if (left + card.width > pad.width) {
    left = pad.width - card.width;
  }
  if (left < 0) {
    left = 0;
  }
  return { top, left };
}
