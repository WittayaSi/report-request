/**
 * Simple in-memory rate limiter for server actions and API routes.
 * Uses a sliding window approach per IP/key.
 *
 * For production with multiple instances, replace with Redis-based solution.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSec: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key.
 * @param key - Unique identifier (e.g., IP + action name)
 * @param config - Rate limit configuration
 * @returns RateLimitResult with success status
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // No entry or window expired — allow and start new window
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowSec * 1000 });
    return { success: true, remaining: config.maxRequests - 1, resetAt: now + config.windowSec * 1000 };
  }

  // Window still active — check count
  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  // Increment
  entry.count++;
  return { success: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

// ---- Pre-configured limiters ----

/** Login: max 5 attempts per 60 seconds per IP */
export const loginLimiter = (ip: string) =>
  checkRateLimit(`login:${ip}`, { maxRequests: 5, windowSec: 60 });

/** File upload: max 10 per minute per user */
export const uploadLimiter = (userId: string) =>
  checkRateLimit(`upload:${userId}`, { maxRequests: 10, windowSec: 60 });

/** Comment: max 20 per minute per user */
export const commentLimiter = (userId: string) =>
  checkRateLimit(`comment:${userId}`, { maxRequests: 20, windowSec: 60 });

/** API calls: max 60 per minute per IP */
export const apiLimiter = (ip: string) =>
  checkRateLimit(`api:${ip}`, { maxRequests: 60, windowSec: 60 });
