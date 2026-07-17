export interface RemoteFocusSession {
  id: string;
  user_name: string;
  duration_minutes: number;
  task_name: string | null;
  created_at: string;
}

export interface LocalFocusFingerprint {
  userName: string;
  completedAt: number;
  durationMinutes: number;
}

/** Stable key for deduping cloud ↔ local focus rows. */
export function focusSessionKey(parts: LocalFocusFingerprint): string {
  return `${parts.userName}|${parts.completedAt}|${parts.durationMinutes}`;
}

export function remoteToFingerprint(remote: RemoteFocusSession): LocalFocusFingerprint {
  return {
    userName: remote.user_name,
    completedAt: new Date(remote.created_at).getTime(),
    durationMinutes: remote.duration_minutes,
  };
}

export function dateStrFromCompletedAt(completedAt: number): string {
  return new Date(completedAt).toISOString().split('T')[0];
}

/** Returns remote sessions that are not already represented in localKeys. */
export function findMissingRemoteSessions(
  remotes: RemoteFocusSession[],
  localKeys: Set<string>
): RemoteFocusSession[] {
  return remotes.filter((remote) => {
    const key = focusSessionKey(remoteToFingerprint(remote));
    return !localKeys.has(key);
  });
}
