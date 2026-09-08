const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function isTypingTag(tagName: string): boolean {
  return TYPING_TAGS.has(tagName);
}

export function notesShortcut(
  key: string,
  typing: boolean,
  hasModifier: boolean,
): 'open' | 'close' | null {
  if (key === 'Escape') return 'close';
  if (key !== 'n' && key !== 'N') return null;
  if (typing || hasModifier) return null;
  return 'open';
}
