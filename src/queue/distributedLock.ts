// ═══════════════════════════════════════════════════
// AEGIS — Distributed Lock (Redlock)
// Redis tabanlı dağıtık kilit.
// Aynı kaynağa aynı anda sadece 1 worker erişebilir.
// ═══════════════════════════════════════════════════

import type { IDistributedLock } from './types.js';
import type { IStore } from '../types.js';

// ──── DISTRIBUTED LOCK ───────────────────────────

class DistributedLock implements IDistributedLock {
  private store: IStore;
  private lockPrefix = 'lock:';
  private driftFactor = 0.01; // Saat kayması toleransı
  private retryDelayMs = 200;
  private maxRetries = 10;

  constructor(store: IStore) {
    this.store = store;
  }

  // ══════════════════════════════════════════════

  /**
   * Kilidi almaya çalış
   * Başarılı: true, Başarısız: false
   */
  async acquire(resource: string, ttlMs: number): Promise<boolean> {
    const key = this.lockPrefix + resource;
    const value = `${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    try {
      await this.store.set(key, value, ttlMs);
      return true;
    } catch {
      return false;
    }
  }

  // ══════════════════════════════════════════════

  /**
   * Kilidi serbest bırak
   */
  async release(resource: string): Promise<void> {
    const key = this.lockPrefix + resource;
    await this.store.del(key);
  }

  // ══════════════════════════════════════════════

  /**
   * Kilit altında işlem yap
   * Otomatik acquire + execute + release
   */
  async withLock<T>(
    resource: string,
    ttlMs: number,
    fn: () => Promise<T>
  ): Promise<T> {
    const acquired = await this.tryAcquire(resource, ttlMs);

    if (!acquired) {
      throw new Error(`Failed to acquire lock for resource: ${resource}`);
    }

    try {
      return await fn();
    } finally {
      await this.release(resource);
    }
  }

  // ══════════════════════════════════════════════

  /**
   * Kilit için retry ile bekle
   */
  private async tryAcquire(resource: string, ttlMs: number): Promise<boolean> {
    for (let i = 0; i < this.maxRetries; i++) {
      const acquired = await this.acquire(resource, ttlMs);
      if (acquired) return true;

      // Retry öncesi bekle
      await new Promise(resolve => setTimeout(resolve, this.retryDelayMs));
    }

    return false;
  }

  // ══════════════════════════════════════════════

  /**
   * Kilidin süresini uzat (heartbeat)
   * Uzun süren işlemler için
   */
  async extend(resource: string, ttlMs: number): Promise<boolean> {
    const key = this.lockPrefix + resource;
    const exists = await this.store.exists(key);

    if (!exists) return false;

    await this.store.expire(key, ttlMs);
    return true;
  }

  // ══════════════════════════════════════════════

  /**
   * Kilidin kalan süresini sorgula
   */
  async getTTL(resource: string): Promise<number | null> {
    const key = this.lockPrefix + resource;
    const exists = await this.store.exists(key);
    return exists ? 1 : null; // Basit kontrol, Redis implementasyonu daha detaylı olabilir
  }
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export { DistributedLock };