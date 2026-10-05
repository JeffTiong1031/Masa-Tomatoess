import { FOCUS_HREFS } from '@/components/nav/navLinks';

function stepFor(key: string, shift: boolean): 1 | -1 | null {
  if (key === 'Tab') return shift ? -1 : 1;
  if (shift) return null;
  if (key === 'ArrowRight') return 1;
  if (key === 'ArrowLeft') return -1;
  return null;
}

export function focusHrefForShortcut(
  key: string,
  shift: boolean,
  typing: boolean,
  hasModifier: boolean,
  overlayOpen: boolean,
  pathname: string,
): string | null {
  if (typing || hasModifier || overlayOpen) return null;
  const step = stepFor(key, shift);
  if (step === null) return null;
  const index = FOCUS_HREFS.indexOf(pathname);
  if (index === -1) return null;
  const count = FOCUS_HREFS.length;
  return FOCUS_HREFS[(index + step + count) % count];
}
