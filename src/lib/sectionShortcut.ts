import { isActiveHref } from '@/components/nav/navLinks';

const SECTION_HREFS: Record<string, string> = {
  s: '/study',
  t: '/timetable',
  d: '/todo',
  c: '/calendar',
  p: '/cycle',
  o: '/countdown',
  m: '/meals',
  f: '/fitness',
  i: '/finance',
};

export function sectionHrefForShortcut(
  key: string,
  typing: boolean,
  hasModifier: boolean,
  overlayOpen: boolean,
  pathname: string,
): string | null {
  if (typing || hasModifier || overlayOpen) return null;
  const href = SECTION_HREFS[key.toLowerCase()];
  if (!href) return null;
  if (isActiveHref(pathname, href)) return null;
  return href;
}
