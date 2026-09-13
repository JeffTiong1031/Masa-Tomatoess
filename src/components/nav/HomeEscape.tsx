'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { shouldGoHomeOnEscape } from '@/lib/homeShortcut';
import { useNotesUiStore } from '@/store/useNotesUiStore';

export function HomeEscape() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const overlayOpen =
        useNotesUiStore.getState().open ||
        document.querySelector('[role="dialog"]') !== null;
      if (
        !shouldGoHomeOnEscape(
          event.key,
          pathname,
          overlayOpen,
          event.metaKey || event.ctrlKey || event.altKey,
        )
      ) {
        return;
      }
      event.preventDefault();
      router.push('/');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pathname, router]);

  return null;
}
