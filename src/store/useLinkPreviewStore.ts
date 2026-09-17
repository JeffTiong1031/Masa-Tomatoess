'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LinkPreview } from '@/lib/noteLink';

interface LinkPreviewState {
  byHref: Record<string, LinkPreview>;
  remember(preview: LinkPreview): void;
  lookup(href: string): LinkPreview | undefined;
}

export const useLinkPreviewStore = create<LinkPreviewState>()(
  persist(
    (set, get) => ({
      byHref: {},
      remember: (preview) =>
        set((state) => ({
          byHref: { ...state.byHref, [preview.href]: preview },
        })),
      lookup: (href) => get().byHref[href],
    }),
    {
      name: 'mt-link-preview',
      partialize: (state) => ({ byHref: state.byHref }),
    },
  ),
);
