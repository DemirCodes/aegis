// ═══════════════════════════════════════════════════
// AEGIS — Deduplication
// Aynı anda gelen aynı istekleri tekilleştirir.
// İlk istek çalışır, diğerleri aynı promise'i bekler.
// ═══════════════════════════════════════════════════

// ──── IN-MEMORY STORE ────────────────────────────

interface DedupEntry {
  promise: Promise<unknown>;
  timestamp: number;
}

const dedupCache = new Map<string, DedupEntry>();

const DEFAULT_DEDUP_TTL_MS = 60000; // 1 dakika

// ──── SÜPÜRME ────────────────────────────────────

function sweepStaleDeduplication(now: number = Date.now()): void {
  for (const [key, entry] of dedupCache) {
    if (now - entry.timestamp > DEFAULT_DEDUP_TTL_MS) {
      dedupCache.delete(key);
    }
  }
}

// ═══════════════════════════════════════════════════
// WITH DEDUPLICATION
// ═══════════════════════════════════════════════════

function withDeduplication<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = DEFAULT_DEDUP_TTL_MS
): Promise<T> {
  const now = Date.now();
  const cached = dedupCache.get(key);

  // Zaten çalışan bir istek var mı?
  if (cached) {
    const expired = now - cached.timestamp >= ttlMs;

    if (!expired) {
      // Aynı promise'i döndür, hepsi aynı sonucu alsın
      return cached.promise as Promise<T>;
    }

    // Süresi dolmuş, sil
    dedupCache.delete(key);
  }

  // Yeni istek başlat
  const promise = fn().finally(() => {
    // İşlem bitince cache'ten temizle
    dedupCache.delete(key);
  });

  dedupCache.set(key, { promise, timestamp: now });

  return promise;
}

// ──── CACHE YÖNETİMİ ─────────────────────────────

function clearDeduplicationCache(): void {
  dedupCache.clear();
}

function getDeduplicationSize(): number {
  return dedupCache.size;
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  withDeduplication,
  clearDeduplicationCache,
  getDeduplicationSize,
  sweepStaleDeduplication,
};