// ═══════════════════════════════════════════════════
// AEGIS — Rate Limiter
// Aynı kaynaktan gelen istek sayısını sınırlar.
// Fixed window algoritması.
// ═══════════════════════════════════════════════════

import type { RateLimitOptions, RateLimitStore } from '../types';

// ──── IN-MEMORY STORE ────────────────────────────

const rateLimits = new Map<string, RateLimitStore>();

// ──── YARDIMCI ──────────────────────────────────

function getRateLimitStore(identifier: string, windowMs: number): RateLimitStore {
  const now = Date.now();
  const store = rateLimits.get(identifier);

  if (!store || now > store.resetAt) {
    const newStore: RateLimitStore = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimits.set(identifier, newStore);
    return newStore;
  }

  return store;
}

// ──── SÜPÜRME ────────────────────────────────────

function sweepStaleRateLimits(now: number = Date.now()): void {
  for (const [key, store] of rateLimits) {
    if (now > store.resetAt) {
      rateLimits.delete(key);
    }
  }
}

// ═══════════════════════════════════════════════════
// WITH RATE LIMIT
// ═══════════════════════════════════════════════════

function withRateLimit<T>(
  identifier: string,
  fn: () => Promise<T>,
  options: RateLimitOptions
): Promise<T> {
  const now = Date.now();
  const store = getRateLimitStore(identifier, options.windowMs);

  // Limit aşıldı mı?
  if (store.count > options.max) {
    const remainingMs = store.resetAt - now;
    const remainingSec = Math.ceil(remainingMs / 1000);
    return Promise.reject(
      new Error(`Rate limit exceeded for "${identifier}". Reset in ${remainingSec}s`)
    );
  }

  // Limit dahilinde, sayacı artır
  store.count++;

  return fn();
}

// ──── RATE LIMIT YÖNETİMİ ────────────────────────

function getRateLimitCount(identifier: string): number {
  const store = rateLimits.get(identifier);
  if (!store || Date.now() > store.resetAt) return 0;
  return store.count;
}

function resetRateLimit(identifier: string): void {
  rateLimits.delete(identifier);
}

function getRateLimits(): Map<string, RateLimitStore> {
  return new Map(rateLimits);
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  withRateLimit,
  getRateLimitCount,
  resetRateLimit,
  getRateLimits,
  sweepStaleRateLimits,
};