const NATIVE_SPACE_TAGS = new Set(['BUTTON', 'A', 'SUMMARY']);

export function isSpaceToggle(
  key: string,
  typing: boolean,
  tagName: string,
  hasModifier: boolean,
  overlayOpen: boolean,
  repeating: boolean,
): boolean {
  if (key !== ' ') return false;
  if (typing || hasModifier || overlayOpen || repeating) return false;
  return !NATIVE_SPACE_TAGS.has(tagName);
}
