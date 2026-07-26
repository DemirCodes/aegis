// ═══════════════════════════════════════════════════
// AEGIS — Throttling
// Kademeli yavaşlatma. Banlamadan önce istekleri geciktirir.
// ═══════════════════════════════════════════════════

import { sleep } from './timeout';

// ──── IN-MEMORY STORE ────────────────────────────

interface ThrottleStore {
  count: number;
  resetAt: number;
  lastDelay: number;
}

const throttles = new Map<string, ThrottleStore>();

// ──── SÜPÜRME ────────────────────────────────────

function sweepStaleThrottles(now: number = Date.now()): void {
  for (const [key, store] of throttles) {
    if (now > store.resetAt) {
      throttles.delete(key);
    }
  }
}

// ═══════════════════════════════════════════════════
// WITH THROTTLING
// ═══════════════════════════════════════════════════

interface ThrottlingOptions {
  max: number;
  windowMs: number;
  delayMs: number;
}

function withThrottling<T>(
  identifier: string,
  fn: () => Promise<T>,
  options: ThrottlingOptions
): Promise<T> {
  const now = Date.now();
  let store = throttles.get(identifier);

  if (!store || now > store.resetAt) {
    store = {
      count: 1,
      resetAt: now + options.windowMs,
      lastDelay: 0,
    };
    throttles.set(identifier, store);
  } else {
    store.count++;
  }

  // Limit aşıldıysa kademeli gecikme uygula
  if (store.count > options.max) {
    // Her aşımda gecikme artsın
    const extraCount = store.count - options.max;
    const delay = options.delayMs * Math.pow(2, extraCount - 1);

    store.lastDelay = delay;

    return sleep(delay).then(() => fn());
  }

  return fn();
}

// ──── THROTTLE YÖNETİMİ ──────────────────────────

function getThrottleStats(identifier: string): { count: number; lastDelay: number } | null {
  const store = throttles.get(identifier);
  if (!store || Date.now() > store.resetAt) return null;
  return { count: store.count, lastDelay: store.lastDelay };
}

function resetThrottle(identifier: string): void {
  throttles.delete(identifier);
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  withThrottling,
  getThrottleStats,
  resetThrottle,
  sweepStaleThrottles,
};