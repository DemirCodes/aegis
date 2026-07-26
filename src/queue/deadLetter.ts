// ═══════════════════════════════════════════════════
// AEGIS — Dead Letter Queue
// Max retry aşımına uğrayan işlemlerin düştüğü kuyruk.
// Manuel inceleme ve replay için.
// ═══════════════════════════════════════════════════

import type { QueueJob, IDeadLetterQueue, DeadLetterEntry, IQueue } from './types.js';

// ──── DEAD LETTER STORE ──────────────────────────

interface DLQEntry {
  id: string;
  originalQueue: string;
  job: QueueJob;
  reason: string;
  failedAt: number;
  replayable: boolean;
  replayCount: number;
  lastReplayAt?: number;
}

// ──── DEAD LETTER QUEUE ──────────────────────────

class DeadLetterQueue implements IDeadLetterQueue {
  private entries = new Map<string, DLQEntry>();
  private targetQueue: IQueue;
  private maxReplayCount: number;

  constructor(targetQueue: IQueue, maxReplayCount: number = 3) {
    this.targetQueue = targetQueue;
    this.maxReplayCount = maxReplayCount;
  }

  // ══════════════════════════════════════════════

  async send(queue: string, job: QueueJob, reason: string): Promise<void> {
    const entry: DLQEntry = {
      id: `dlq_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      originalQueue: queue,
      job,
      reason,
      failedAt: Date.now(),
      replayable: true,
      replayCount: 0,
    };

    this.entries.set(entry.id, entry);
  }

  // ══════════════════════════════════════════════

  async list(options?: { limit?: number; offset?: number; queue?: string }): Promise<DeadLetterEntry[]> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const queue = options?.queue;

    let entries = Array.from(this.entries.values());

    if (queue) {
      entries = entries.filter(e => e.originalQueue === queue);
    }

    // En yeni başarısızlıklar önce
    entries.sort((a, b) => b.failedAt - a.failedAt);

    return entries.slice(offset, offset + limit).map(e => ({
      id: e.id,
      originalQueue: e.originalQueue,
      job: e.job,
      reason: e.reason,
      failedAt: e.failedAt,
      replayable: e.replayable && e.replayCount < this.maxReplayCount,
    }));
  }

  // ══════════════════════════════════════════════

  async replay(id: string, options?: { rateLimit?: number; backoff?: boolean }): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`DLQ entry not found: ${id}`);
    }

    if (!entry.replayable) {
      throw new Error(`DLQ entry not replayable: ${id}`);
    }

    if (entry.replayCount >= this.maxReplayCount) {
      entry.replayable = false;
      throw new Error(`Max replay count (${this.maxReplayCount}) exceeded for: ${id}`);
    }

    // Rate limit için delay


    const rateLimit = options?.rateLimit;
    if (rateLimit && rateLimit > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000 / rateLimit));
    }

    // Ana kuyruğa geri ekle
    await this.targetQueue.add(entry.originalQueue, entry.job.data, {
      priority: 'medium',
      attempts: entry.job.maxAttempts - entry.job.attemptsMade,
      jobId: entry.job.id,
    });

    // Replay sayacını güncelle
    entry.replayCount++;
    entry.lastReplayAt = Date.now();

    if (entry.replayCount >= this.maxReplayCount) {
      entry.replayable = false;
    }
  }

  // ══════════════════════════════════════════════

  async remove(id: string): Promise<void> {
    this.entries.delete(id);
  }

  // ══════════════════════════════════════════════

  async getStats(): Promise<{ total: number; replayable: number }> {
    const all = Array.from(this.entries.values());
    return {
      total: all.length,
      replayable: all.filter(e => e.replayable && e.replayCount < this.maxReplayCount).length,
    };
  }

  // ══════════════════════════════════════════════

  /**
   * Belirli bir orijinal kuyruktaki tüm DLQ entry'lerini replay et
   */
  async replayAll(queue?: string): Promise<number> {
    const entries = await this.list({ queue, limit: 1000 });
    let count = 0;

    for (const entry of entries) {
      if (entry.replayable) {
        try {
          await this.replay(entry.id);
          count++;
        } catch {
          // Bu entry replay edilemedi, diğerlerine devam et
        }
      }
    }

    return count;
  }

  // ══════════════════════════════════════════════

  /**
   * Belirli bir süreden eski entry'leri temizle
   */
  async purge(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const now = Date.now();
    let count = 0;

    for (const [id, entry] of this.entries) {
      if (now - entry.failedAt > olderThanMs) {
        this.entries.delete(id);
        count++;
      }
    }

    return count;
  }
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export { DeadLetterQueue };
export type { DLQEntry };