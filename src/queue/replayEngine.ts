// ═══════════════════════════════════════════════════
// AEGIS — Replay Engine
// DLQ'daki işlemleri ana kuyruğa geri besler.
// Rate limit'e takılmadan güvenli tekrar işleme.
// ═══════════════════════════════════════════════════

import type { IDeadLetterQueue, IQueue } from './types.js';

// ──── REPLAY ENGINE ──────────────────────────────

class ReplayEngine {
  private dlq: IDeadLetterQueue;
  private targetQueue: IQueue;
  private rateLimitPerSecond: number;
  private lastReplayTime = 0;

  constructor(dlq: IDeadLetterQueue, targetQueue: IQueue, rateLimitPerSecond: number = 10) {
    this.dlq = dlq;
    this.targetQueue = targetQueue;
    this.rateLimitPerSecond = rateLimitPerSecond;
  }

  // ══════════════════════════════════════════════

  /**
   * Tek bir job'ı DLQ'dan ana kuyruğa geri besle
   */
  async replay(id: string, options?: { backoff?: boolean; delayMs?: number }): Promise<void> {
    // Rate limit kontrolü
    await this.waitForRateLimit();

    if (options?.delayMs) {
      await new Promise(resolve => setTimeout(resolve, options.delayMs));
    }

    await this.dlq.replay(id, {
      rateLimit: this.rateLimitPerSecond,
      backoff: options?.backoff,
    });
  }

  // ══════════════════════════════════════════════

  /**
   * Belirli bir kuyruktaki tüm DLQ entry'lerini replay et
   */
  async replayQueue(queue: string, options?: { batchSize?: number; delayBetweenBatches?: number }): Promise<{
    total: number;
    successful: number;
    failed: number;
  }> {
    const batchSize = options?.batchSize || 10;
    const delayBetweenBatches = options?.delayBetweenBatches || 1000;

    const entries = await this.dlq.list({ queue, limit: 1000 });
    const replayable = entries.filter(e => e.replayable);

    let successful = 0;
    let failed = 0;

    for (let i = 0; i < replayable.length; i += batchSize) {
      const batch = replayable.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(entry => this.replay(entry.id))
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          successful++;
        } else {
          failed++;
        }
      }

      // Batch'ler arası bekle
      if (i + batchSize < replayable.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    return { total: replayable.length, successful, failed };
  }

  // ══════════════════════════════════════════════

  /**
   * Tüm DLQ'yu tara ve replay edilebilir olanları geri besle
   */
  async replayAll(options?: {
    queues?: string[];
    batchSize?: number;
    delayBetweenBatches?: number;
  }): Promise<Record<string, { total: number; successful: number; failed: number }>> {
    const results: Record<string, { total: number; successful: number; failed: number }> = {};

    if (options?.queues) {
      for (const queue of options.queues) {
        results[queue] = await this.replayQueue(queue, options);
      }
    } else {
      // Tüm kuyrukları tara
      const allEntries = await this.dlq.list({ limit: 10000 });
      const queues = [...new Set(allEntries.map(e => e.originalQueue))];

      for (const queue of queues) {
        results[queue] = await this.replayQueue(queue, options);
      }
    }

    return results;
  }

  // ══════════════════════════════════════════════

  /**
   * Rate limit'i güncelle
   */
  setRateLimit(perSecond: number): void {
    this.rateLimitPerSecond = perSecond;
  }

  // ══════════════════════════════════════════════

  /**
   * DLQ'daki bir entry'i kalıcı olarak sil (replay etmeden)
   */
  async discard(id: string): Promise<void> {
    await this.dlq.remove(id);
  }

  // ══════════════════════════════════════════════

  /**
   * Belirli bir kuyruktaki tüm DLQ entry'lerini sil
   */
  async purgeQueue(queue: string): Promise<number> {
    const entries = await this.dlq.list({ queue, limit: 10000 });
    
    for (const entry of entries) {
      await this.dlq.remove(entry.id);
    }

    return entries.length;
  }

  // ══════════════════════════════════════════════
  // PRIVATE
  // ══════════════════════════════════════════════

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const minInterval = 1000 / this.rateLimitPerSecond;
    const timeSinceLastReplay = now - this.lastReplayTime;

    if (timeSinceLastReplay < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastReplay));
    }

    this.lastReplayTime = Date.now();
  }
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export { ReplayEngine };