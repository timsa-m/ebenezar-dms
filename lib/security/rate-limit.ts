import { SECURITY_CONFIG } from './config';

interface RateLimitRecord {
  failedCount: number;
  lockedUntil?: number;
  lastAttempt: number;
}

// In-memory store for failed verification tracking
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Checks if the key (e.g. userId or ipAddress) is currently locked out
 */
export function checkRateLimit(key: string): { isLocked: boolean; remainingSeconds?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record) return { isLocked: false };

  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isLocked: true, remainingSeconds };
  }

  // If lockout expired, reset
  if (record.lockedUntil && record.lockedUntil <= now) {
    rateLimitStore.delete(key);
    return { isLocked: false };
  }

  // If last attempt was older than lockout duration, reset
  if (now - record.lastAttempt > SECURITY_CONFIG.LOCKOUT_DURATION_SECONDS * 1000) {
    rateLimitStore.delete(key);
    return { isLocked: false };
  }

  return { isLocked: false };
}

/**
 * Records a failed verification attempt. If threshold exceeded, triggers lockout.
 */
export function recordFailedAttempt(key: string): { isLocked: boolean; remainingAttempts: number; remainingSeconds?: number } {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { failedCount: 1, lastAttempt: now };
    rateLimitStore.set(key, record);
    return {
      isLocked: false,
      remainingAttempts: SECURITY_CONFIG.MAX_FAILED_VERIFICATIONS - 1,
    };
  }

  record.failedCount += 1;
  record.lastAttempt = now;

  if (record.failedCount >= SECURITY_CONFIG.MAX_FAILED_VERIFICATIONS) {
    record.lockedUntil = now + SECURITY_CONFIG.LOCKOUT_DURATION_SECONDS * 1000;
    return {
      isLocked: true,
      remainingAttempts: 0,
      remainingSeconds: SECURITY_CONFIG.LOCKOUT_DURATION_SECONDS,
    };
  }

  return {
    isLocked: false,
    remainingAttempts: SECURITY_CONFIG.MAX_FAILED_VERIFICATIONS - record.failedCount,
  };
}

/**
 * Resets failed attempts after a successful verification.
 */
export function resetFailedAttempts(key: string): void {
  rateLimitStore.delete(key);
}
