'use client';

import { Share, Plus } from 'lucide-react';
import { useHasMounted } from '@/hooks/useHasMounted';

export default function InstallPrompt() {
  // useHasMounted (useSyncExternalStore) reports false on the server and on
  // the first client render, then flips true. Deriving from it keeps the
  // hydration render pure AND avoids react-hooks/set-state-in-effect, which
  // is error severity in this repo — an unconditional setState in an effect
  // body will fail `npm run lint`.
  const mounted = useHasMounted();
  const isIOS = mounted && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    !mounted || window.matchMedia('(display-mode: standalone)').matches;

  // Already installed, or still server-rendering — say nothing.
  if (isStandalone) return null;

  return (
    <div className="mt-soft p-4">
      <div className="text-sm font-semibold text-[var(--mt-text)]">
        Add Masa Tomato to your home screen
      </div>
      {isIOS ? (
        <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-[var(--mt-text-muted)]">
          Tap
          <Share size={13} aria-hidden className="inline" />
          <span className="sr-only">the Share button</span>
          then
          <Plus size={13} aria-hidden className="inline" />
          <span>Add to Home Screen</span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-[var(--mt-text-muted)]">
          Open your browser menu and choose Install app.
        </p>
      )}
    </div>
  );
}
