'use server';

import { timingSafeEqual } from 'crypto';

// Simple in-memory rate limiter (per server instance)
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function verifyPassword(password: string): Promise<{ success: boolean; error?: string }> {
  const appPassword = process.env.APP_PASSWORD;

  if (!appPassword) {
    console.warn('APP_PASSWORD is not set in environment variables.');
    return { success: false, error: 'Server misconfigured.' };
  }

  // Rate limiting: use a generic key since we don't have IP in server actions easily.
  // In production with middleware, you'd use the client IP.
  const rateLimitKey = 'global';
  const record = failedAttempts.get(rateLimitKey);

  if (record && record.count >= MAX_ATTEMPTS) {
    const elapsed = Date.now() - record.lastAttempt;
    if (elapsed < LOCKOUT_MS) {
      const minutesLeft = Math.ceil((LOCKOUT_MS - elapsed) / 60000);
      return { success: false, error: `Too many attempts. Try again in ${minutesLeft} min.` };
    }
    // Lockout expired, reset
    failedAttempts.delete(rateLimitKey);
  }

  // Constant-time comparison
  const passwordBuffer = Buffer.from(password);
  const appPasswordBuffer = Buffer.from(appPassword);

  let isValid = false;
  if (passwordBuffer.length === appPasswordBuffer.length) {
    isValid = timingSafeEqual(passwordBuffer, appPasswordBuffer);
  }

  if (!isValid) {
    const current = failedAttempts.get(rateLimitKey) || { count: 0, lastAttempt: 0 };
    failedAttempts.set(rateLimitKey, { count: current.count + 1, lastAttempt: Date.now() });
    return { success: false, error: 'Incorrect password' };
  }

  // Success — reset rate limiter
  failedAttempts.delete(rateLimitKey);
  return { success: true };
}
