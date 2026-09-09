const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function isTypingTag(tagName: string): boolean {
  return TYPING_TAGS.has(tagName);
}

export function isTypingElement(
  tagName: string,
  contentEditable: boolean,
): boolean {
  return isTypingTag(tagName) || contentEditable;
}

export function isChecklistHotkey(
  key: string,
  shift: boolean,
  ctrlOrMeta: boolean,
  alt: boolean,
): boolean {
  return key === '9' && shift && ctrlOrMeta && !alt;
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
