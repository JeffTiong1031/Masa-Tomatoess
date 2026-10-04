'use client';

import { useEffect } from 'react';
import { isTypingElement } from '@/lib/noteShortcut';
import { flexibleKeyFor, type FlexibleKey } from '@/lib/flexibleShortcut';
import { useNotesUiStore } from '@/store/useNotesUiStore';

export function useFlexibleKeys(onKey: (key: FlexibleKey) => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as {
        tagName?: string;
        isContentEditable?: boolean;
      };
      const tagName = target.tagName ?? '';
      const typing = isTypingElement(tagName, target.isContentEditable === true);
      const overlayOpen =
        useNotesUiStore.getState().open ||
        document.querySelector('[role="dialog"]') !== null;
      const key = flexibleKeyFor(
        event.key,
        typing,
        tagName,
        event.metaKey || event.ctrlKey || event.altKey,
        overlayOpen,
        event.repeat,
      );
      if (key === null) return;
      event.preventDefault();
      onKey(key);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKey]);
}
