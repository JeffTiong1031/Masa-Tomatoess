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
      <div className="min-h-dvh bg-[var(--mt-midnight)] flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  if (userName) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[var(--mt-midnight)]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-4 pb-[max(1rem,var(--mt-safe-bottom))]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gatekeeper-title"
        className="bg-[var(--mt-surface)] border border-white/10 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md text-white"
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
              className="min-h-12 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/60 text-white"
              autoFocus
              autoComplete="current-password"
            />
            {error && (
              <p className="text-red-400 text-sm text-center" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="min-h-12 px-4 py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
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
              className="min-h-14 px-4 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors font-medium disabled:opacity-50"
            >
              Jeff
            </button>
            <button
              type="button"
              disabled={isSyncing}
              onClick={() => handleIdentitySelect('Rachel')}
              className="min-h-14 px-4 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors font-medium disabled:opacity-50"
            >
              Rachel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
