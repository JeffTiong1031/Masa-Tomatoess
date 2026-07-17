/** Max focus minutes allowed when syncing to Supabase (security CHECK bound). */
export const MAX_FOCUS_DURATION_MINUTES = 24 * 60;

/** Clamp duration for Supabase insert; must stay within the DB CHECK constraint. */
export function clampDurationMinutes(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, Math.round(n)), MAX_FOCUS_DURATION_MINUTES);
}
