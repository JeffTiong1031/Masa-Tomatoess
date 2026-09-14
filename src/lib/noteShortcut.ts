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

export function isStyleHotkey(
  key: string,
  shift: boolean,
  ctrlOrMeta: boolean,
  alt: boolean,
): 'bold' | 'underline' | null {
  if (!ctrlOrMeta || shift || alt) {
    return null;
  }
  if (key === 'b' || key === 'B') {
    return 'bold';
  }
  if (key === 'u' || key === 'U') {
    return 'underline';
  }
  return null;
}

export function isEditorCommandBlocked(
  composing: boolean,
  eventComposing: boolean,
  key: string,
): boolean {
  return composing || eventComposing || key === 'Process';
}

/** Ctrl+S, and the browser's own Save page can wait. Deliberately fires
 *  while typing: that is the moment the hand reaches for it. */
export function isSaveShortcut(key: string, ctrlOrMeta: boolean): boolean {
  return ctrlOrMeta && (key === 's' || key === 'S');
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
