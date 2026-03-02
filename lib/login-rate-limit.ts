type RateLimitRecord = {
  count: number;
  resetAt: number;
};

export type LoginRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
// In-memory store for MVP. Replace this Map with Redis-backed storage when scaling to multi-instance.
const bucket = new Map<string, RateLimitRecord>();

function nowMs() {
  return Date.now();
}

function cleanupExpired() {
  const now = nowMs();
  for (const [key, value] of bucket.entries()) {
    if (value.resetAt <= now) {
      bucket.delete(key);
    }
  }
}

export function checkLoginRateLimit(key: string): LoginRateLimitResult {
  cleanupExpired();
  const now = nowMs();
  const value = bucket.get(key);

  if (!value || value.resetAt <= now) {
    bucket.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, retryAfterSec: Math.ceil(WINDOW_MS / 1000) };
  }

  if (value.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((value.resetAt - now) / 1000))
    };
  }

  value.count += 1;
  bucket.set(key, value);
  return {
    allowed: true,
    remaining: Math.max(0, MAX_ATTEMPTS - value.count),
    retryAfterSec: Math.max(1, Math.ceil((value.resetAt - now) / 1000))
  };
}

