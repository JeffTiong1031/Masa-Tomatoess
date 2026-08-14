'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { verifyPassword } from '@/app/actions/auth';
import { syncSessions } from '@/lib/sync';
import { useHasMounted } from '@/hooks/useHasMounted';

function subscribeStorage(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  return () => window.removeEventListener('storage', onStoreChange);
}

function readStoredUser(): string | null {
  return localStorage.getItem('user_name');
}

export default function Gatekeeper({ children }: { children: React.ReactNode }) {
  const mounted = useHasMounted();
  const storedUser = useSyncExternalStore(
    subscribeStorage,
    readStoredUser,
    () => null
  );
  const [localUser, setLocalUser] = useState<string | null>(null);
  const userName = localUser ?? storedUser;
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!storedUser) return;
    syncSessions().catch(console.error);
  }, [storedUser]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await verifyPassword(password);
    if (result.success) {
      setIsPasswordVerified(true);
    } else {
      setError(result.error || 'Incorrect password');
    }
  };

  const handleIdentitySelect = async (name: string) => {
    setIsSyncing(true);
    localStorage.setItem('user_name', name);
    setLocalUser(name);
    try {
      await syncSessions();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!mounted) {
    return (
      <div
        data-mood="light"
        className="min-h-dvh bg-[var(--mt-bg)] flex items-center justify-center text-[var(--mt-text)]"
      >
        Loading...
      </div>
    );
  }

  if (userName) {
    return <>{children}</>;
  }

  return (
    <div
      data-mood="light"
      className="fixed inset-0 z-[9999] bg-[var(--mt-bg)]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-4 pb-[max(1rem,var(--mt-safe-bottom))]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gatekeeper-title"
        className="bg-[var(--mt-surface)] border border-[var(--mt-border)] p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md text-[var(--mt-text)]"
      >
        <h2
          id="gatekeeper-title"
          className="text-2xl font-light mb-6 text-center tracking-wide"
        >
          {!isPasswordVerified ? 'Enter Shared Secret' : 'Select Identity'}
        </h2>

        {!isPasswordVerified ? (
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            <label htmlFor="shared-password" className="sr-only">
              Shared password
            </label>
            <input
              id="shared-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password..."
              className="min-h-12 px-4 py-3 bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] border border-[var(--mt-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--mt-accent)] text-[var(--mt-text)]"
              autoFocus
              autoComplete="current-password"
            />
            {error && (
              <p className="text-[var(--mt-danger)] text-sm text-center" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="min-h-12 px-4 py-3 bg-[var(--mt-accent)] text-[var(--mt-accent-contrast)] font-semibold rounded-xl hover:opacity-90 transition-colors"
            >
              Verify
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={isSyncing}
              onClick={() => handleIdentitySelect('Jeff')}
              className="min-h-14 px-4 py-4 bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] hover:bg-[color-mix(in_srgb,var(--mt-text)_10%,transparent)] border border-[var(--mt-border)] rounded-xl transition-colors font-medium disabled:opacity-50"
            >
              Jeff
            </button>
            <button
              type="button"
              disabled={isSyncing}
              onClick={() => handleIdentitySelect('Rachel')}
              className="min-h-14 px-4 py-4 bg-[color-mix(in_srgb,var(--mt-text)_6%,transparent)] hover:bg-[color-mix(in_srgb,var(--mt-text)_10%,transparent)] border border-[var(--mt-border)] rounded-xl transition-colors font-medium disabled:opacity-50"
            >
              Rachel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
