'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isTypingElement } from '@/lib/noteShortcut';
import { sectionHrefForShortcut } from '@/lib/sectionShortcut';
import { useNotesUiStore } from '@/store/useNotesUiStore';

export function SectionShortcut() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as {
        tagName?: string;
        isContentEditable?: boolean;
      };
      const typing = isTypingElement(
        target.tagName ?? '',
        target.isContentEditable === true,
      );
      const overlayOpen =
        useNotesUiStore.getState().open ||
        document.querySelector('[role="dialog"]') !== null;
      const href = sectionHrefForShortcut(
        event.key,
        typing,
        event.metaKey || event.ctrlKey || event.altKey,
        overlayOpen,
        pathname,
      );
      if (href === null) return;
      event.preventDefault();
      router.push(href);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pathname, router]);

  return null;
}
