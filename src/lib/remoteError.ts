export type RemoteError = {
  message?: string;
  code?: string;
  details?: string;
};

export function firstRemoteError(
  ...errors: Array<RemoteError | null>
): RemoteError | null {
  for (const error of errors) {
    if (error !== null) return error;
  }
  return null;
}

export function remoteErrorText(error: RemoteError): string {
  const parts = [error.code, error.message].filter(
    (part) => part !== undefined && part !== '',
  );
  return parts.join(' — ') || 'unknown remote error';
}

export function isOfflineRemoteError(error: RemoteError): boolean {
  const text = `${error.message ?? ''} ${error.details ?? ''}`;
  return /failed to fetch|networkerror|network error|load failed|aborterror|the user aborted/i.test(
    text,
  );
}

export function logRemoteError(label: string, error: RemoteError): void {
  if (isOfflineRemoteError(error)) return;
  console.error(label, remoteErrorText(error));
}
