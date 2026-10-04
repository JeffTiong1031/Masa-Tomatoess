'use client';

import { useEffect } from 'react';
import { isTypingElement } from '@/lib/noteShortcut';
import { isSpaceToggle } from '@/lib/spaceShortcut';
import { useNotesUiStore } from '@/store/useNotesUiStore';

export function useSpaceToggle(onToggle: () => void) {
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
      const pressed = isSpaceToggle(
        event.key,
        typing,
        tagName,
        event.metaKey || event.ctrlKey || event.altKey,
        overlayOpen,
        event.repeat,
      );
      if (!pressed) return;
      event.preventDefault();
      onToggle();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onToggle]);
}
