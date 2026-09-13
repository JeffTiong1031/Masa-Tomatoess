export function remoteErrorText(error: {
  message?: string;
  code?: string;
  details?: string;
}): string {
  const parts = [error.code, error.message].filter(
    (part) => part !== undefined && part !== '',
  );
  return parts.join(' — ') || 'unknown remote error';
}

export function isOfflineRemoteError(error: {
  message?: string;
  details?: string;
}): boolean {
  const text = `${error.message ?? ''} ${error.details ?? ''}`;
  return /failed to fetch|networkerror|network error|load failed|aborterror|the user aborted/i.test(
    text,
  );
}

export function logRemoteError(
  label: string,
  error: { message?: string; code?: string; details?: string },
): void {
  if (isOfflineRemoteError(error)) return;
  console.error(label, remoteErrorText(error));
}
