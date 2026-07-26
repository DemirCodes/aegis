// ═══════════════════════════════════════════════════
// AEGIS — Bulkhead
// Kaynak havuzu izolasyonu.
// Aynı anda max X işlem, fazlası kuyrukta bekler.
// ═══════════════════════════════════════════════════

import type { BulkheadOptions } from '../types';

// ──── IN-MEMORY STORE ────────────────────────────

interface BulkheadPool {
  active: number;
  queue: Array<() => void>;
}

const bulkheads = new Map<string, BulkheadPool>();

// ──── YARDIMCI ──────────────────────────────────

function getPool(name: string): BulkheadPool {
  if (!bulkheads.has(name)) {
    bulkheads.set(name, { active: 0, queue: [] });
  }
  return bulkheads.get(name)!;
}

// ═══════════════════════════════════════════════════
// WITH BULKHEAD
// ═══════════════════════════════════════════════════

function withBulkhead<T>(
  name: string,
  fn: () => Promise<T>,
  options: BulkheadOptions
): Promise<T> {
  const pool = getPool(name);
  const maxQueueSize = options.maxQueueSize ?? options.maxConcurrent * 10;

  return new Promise((resolve, reject) => {
    // Kuyruk limiti aşıldı mı?
    if (pool.queue.length >= maxQueueSize) {
      return reject(new Error(`Bulkhead "${name}" queue full (${pool.queue.length}/${maxQueueSize})`));
    }

    function execute(): void {
      pool.active++;

      fn()
        .then(result => {
          pool.active--;
          processQueue();
          resolve(result);
        })
        .catch(error => {
          pool.active--;
          processQueue();
          reject(error);
        });
    }

    function processQueue(): void {
      if (pool.queue.length > 0 && pool.active < options.maxConcurrent) {
        const next = pool.queue.shift();
        if (next) next();
      }
    }

    // Şu an yer var mı?
    if (pool.active < options.maxConcurrent) {
      execute();
    } else {
      pool.queue.push(execute);
    }
  });
}

// ──── BULKHEAD YÖNETİMİ ──────────────────────────

function getBulkheadStats(name: string): { active: number; queued: number } {
  const pool = bulkheads.get(name);
  if (!pool) return { active: 0, queued: 0 };
  return { active: pool.active, queued: pool.queue.length };
}

function resetBulkhead(name: string): void {
  const pool = bulkheads.get(name);
  if (pool) {
    pool.active = 0;
    pool.queue = [];
  }
}

function getBulkheads(): Map<string, { active: number; queued: number }> {
  const result = new Map<string, { active: number; queued: number }>();
  for (const [key, pool] of bulkheads) {
    result.set(key, { active: pool.active, queued: pool.queue.length });
  }
  return result;
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  withBulkhead,
  getBulkheadStats,
  resetBulkhead,
  getBulkheads,
};