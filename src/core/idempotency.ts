// ═══════════════════════════════════════════════════
// AEGIS — Idempotency
// Aynı key ile gelen isteği sadece 1 kere işler.
// Pending promise cache ile race condition koruması.
// ═══════════════════════════════════════════════════

import type { IdempotencyEntry } from '../types';

// ──── IN-MEMORY STORE ────────────────────────────

const idempotencyCache = new Map<string, IdempotencyEntry<any>>();

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün

// ──── SÜPÜRME ────────────────────────────────────

function sweepStaleIdempotency(now: number = Date.now()): void {
  for (const [key, entry] of idempotencyCache) {
    if (entry.status === 'done' && now - entry.timestamp > DEFAULT_TTL_MS) {
      idempotencyCache.delete(key);
    }
  }
}

// ═══════════════════════════════════════════════════
// WITH IDEMPOTENCY
// ═══════════════════════════════════════════════════

function withIdempotency<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const now = Date.now();
  const cached = idempotencyCache.get(key);

  // ──── Cache kontrolü ────────────────────────────

  if (cached) {
    const expired = cached.status === 'done' && now - cached.timestamp >= ttlMs;

    if (!expired) {
      // Ya hâlâ çalışıyor (pending) ya da yakın zamanda bitmiş (done)
      return cached.promise;
    }

    // Süresi dolmuş, sil ve yeniden işle
    idempotencyCache.delete(key);
  }

  // ──── Yeni işlem başlat ─────────────────────────

  const promise = fn()
    .then(result => {
      const entry = idempotencyCache.get(key);
      if (entry) {
        entry.status = 'done';
        entry.timestamp = Date.now();
      }
      return result;
    })
    .catch(error => {
      // Başarısız işlemi cache'te TUTMA — geçici hata sonuçmuş gibi dönmesin
      idempotencyCache.delete(key);
      throw error;
    });

  idempotencyCache.set(key, {
    status: 'pending',
    promise,
    timestamp: now,
  });

  return promise;
}

// ──── CACHE YÖNETİMİ ─────────────────────────────

function clearIdempotencyCache(): void {
  idempotencyCache.clear();
}

function getIdempotencyCacheSize(): number {
  return idempotencyCache.size;
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  withIdempotency,
  clearIdempotencyCache,
  getIdempotencyCacheSize,
  sweepStaleIdempotency,
};