'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/** True after client hydration; false during SSR / first paint. */
export function useHasMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
