export function clampRestRatio(n: number): number {
  if (!Number.isFinite(n)) return 5;
  return Math.min(10, Math.max(2, Math.round(n)));
}

export function computeRestSeconds(
  studyElapsedSeconds: number,
  restRatio: number
): number {
  const ratio = clampRestRatio(restRatio);
  if (studyElapsedSeconds <= 0) return 0;
  return Math.floor(studyElapsedSeconds / ratio);
}

/** Returns whole minutes to log, or null if under 1 minute. */
export function elapsedMinutesToLog(elapsedSeconds: number): number | null {
  if (elapsedSeconds < 60) return null;
  return Math.floor(elapsedSeconds / 60);
}
