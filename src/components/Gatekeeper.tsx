'use client';

import { useState, useEffect } from 'react';
import { verifyPassword } from '@/app/actions/auth';
import { syncSessions } from '@/lib/sync';

export default function Gatekeeper({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem('user_name');
    if (storedName) {
      setUserName(storedName);
      // Fire off initial sync
      syncSessions().catch(console.error);
    }
    setIsLoading(false);
  }, []);

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

  const handleIdentitySelect = (name: string) => {
    localStorage.setItem('user_name', name);
    setUserName(name);
    syncSessions().catch(console.error);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading...</div>;
  }

  if (userName) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl w-full max-w-md text-white">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {!isPasswordVerified ? 'Enter Shared Secret' : 'Select Identity'}
        </h2>

        {!isPasswordVerified ? (
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password..."
              className="px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              className="px-4 py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Verify
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => handleIdentitySelect('Jeff')}
              className="px-4 py-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors font-medium"
            >
              Jeff
            </button>
            <button
              onClick={() => handleIdentitySelect('Rachel')}
              className="px-4 py-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors font-medium"
            >
              Rachel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
