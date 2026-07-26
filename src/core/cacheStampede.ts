// ═══════════════════════════════════════════════════
// AEGIS — Cache Stampede Protection
// Cache süresi dolduğunda oluşan Thundering Herd'ü engeller.
// Sadece 1 istek DB'ye gider, diğerleri bekler veya stale veri döner.
// ═══════════════════════════════════════════════════

import type { CacheStampedeStrategy } from '../types';

// ──── IN-MEMORY STORE ────────────────────────────

interface StampedeEntry<T = unknown> {
  value: T;
  expiresAt: number;
  updating: boolean;
  lastUpdated: number;
}

const stampedeCache = new Map<string, StampedeEntry<any>>();

// ═══════════════════════════════════════════════════
// WITH CACHE STAMPEDE
// ═══════════════════════════════════════════════════

interface CacheStampedeOptions {
  key: string;
  ttlMs: number;
  strategy: CacheStampedeStrategy;
}

function withCacheStampede<T>(
  fn: () => Promise<T>,
  options: CacheStampedeOptions
): Promise<T> {
  const now = Date.now();
  const entry = stampedeCache.get(options.key);

  // ──── Cache HIT (geçerli) ──────────────────────
  if (entry && now < entry.expiresAt) {
    return Promise.resolve(entry.value as T);
  }

  // ──── Cache STALE ama biri güncelliyor ─────────
  if (entry && entry.updating) {
    if (options.strategy === 'stale-while-revalidate') {
      // Eski veriyi dön, güncelleme arka planda devam etsin
      return Promise.resolve(entry.value as T);
    }

    // promise-cache: güncellemenin bitmesini bekle
    return waitForUpdate<T>(options.key);
  }

  // ──── Cache MISS — güncellemeyi başlat ─────────
  stampedeCache.set(options.key, {
    value: entry?.value,
    expiresAt: now + options.ttlMs,
    updating: true,
    lastUpdated: now,
  });

  return fn()
    .then(result => {
      stampedeCache.set(options.key, {
        value: result,
        expiresAt: now + options.ttlMs,
        updating: false,
        lastUpdated: now,
      });
      return result;
    })
    .catch(error => {
      // Hata durumunda eski veriyi dön veya hatayı fırlat
      if (entry?.value !== undefined && options.strategy === 'stale-while-revalidate') {
        stampedeCache.set(options.key, {
          value: entry.value,
          expiresAt: entry.expiresAt,
          updating: false,
          lastUpdated: entry.lastUpdated,
        });
        return entry.value as T;
      }

      stampedeCache.delete(options.key);
      throw error;
    });
}

// ──── YARDIMCI ──────────────────────────────────

function waitForUpdate<T>(key: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const maxWaitMs = 10000; // Max 10 saniye bekle
    const start = Date.now();

    function check(): void {
      const entry = stampedeCache.get(key);

      if (entry && !entry.updating) {
        return resolve(entry.value as T);
      }

      if (Date.now() - start > maxWaitMs) {
        stampedeCache.delete(key);
        return reject(new Error(`Cache stampede wait timeout for key: ${key}`));
      }

      setTimeout(check, 100);
    }

    check();
  });
}

// ──── CACHE YÖNETİMİ ────────────────────────────

function clearStampedeCache(): void {
  stampedeCache.clear();
}

function getStampedeCacheSize(): number {
  return stampedeCache.size;
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  withCacheStampede,
  clearStampedeCache,
  getStampedeCacheSize,
};

export type { CacheStampedeOptions };