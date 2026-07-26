// ═══════════════════════════════════════════════════
// AEGIS — Delayed Queue
// İşlemi X saniye sonra çalıştırır.
// Rate limit backoff için de kullanılır.
// ═══════════════════════════════════════════════════

import type { IQueue, QueueAddOptions, QueueJob, QueueStats } from './types.js';

// ──── DELAYED JOB STORE ──────────────────────────

interface DelayedJob {
  id: string;
  name: string;
  data: unknown;
  executeAt: number;
  options?: QueueAddOptions;
  timer?: NodeJS.Timeout;
}

// ──── DELAYED QUEUE ──────────────────────────────

class DelayedQueue {
  private jobs = new Map<string, DelayedJob>();
  private targetQueue: IQueue;

  constructor(targetQueue: IQueue) {
    this.targetQueue = targetQueue;
  }

  // ══════════════════════════════════════════════

  /**
   * İşlemi belirtilen süre sonra ana kuyruğa ekle
   */
  async add(
    name: string,
    data: unknown,
    delayMs: number,
    options?: QueueAddOptions
  ): Promise<string> {
    const id = options?.jobId || `delayed_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const executeAt = Date.now() + delayMs;

    const job: DelayedJob = {
      id,
      name,
      data,
      executeAt,
      options,
    };

    // Zamanlayıcıyı ayarla
    const timer = setTimeout(async () => {
      await this.targetQueue.add(name, data, {
        ...options,
        jobId: id,
        delay: undefined,
      });
      this.jobs.delete(id);
    }, delayMs);

    job.timer = timer;
    this.jobs.set(id, job);

    return id;
  }

  // ══════════════════════════════════════════════

  /**
   * Planlanmış işi iptal et
   */
  cancel(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    if (job.timer) {
      clearTimeout(job.timer);
    }
    this.jobs.delete(id);
    return true;
  }

  // ══════════════════════════════════════════════

  /**
   * Kalan süreyi sorgula (ms)
   */
  getRemainingMs(id: string): number | null {
    const job = this.jobs.get(id);
    if (!job) return null;

    const remaining = job.executeAt - Date.now();
    return Math.max(0, remaining);
  }

  // ══════════════════════════════════════════════

  /**
   * Bekleyen iş sayısı
   */
  getPendingCount(): number {
    return this.jobs.size;
  }

  // ══════════════════════════════════════════════

  /**
   * Bekleyen tüm işleri listele
   */
  list(): DelayedJob[] {
    return Array.from(this.jobs.values()).map(j => ({
      id: j.id,
      name: j.name,
      data: j.data,
      executeAt: j.executeAt,
      options: j.options,
    }));
  }

  // ══════════════════════════════════════════════

  /**
   * Tüm zamanlayıcıları temizle
   */
  destroy(): void {
    for (const job of this.jobs.values()) {
      if (job.timer) {
        clearTimeout(job.timer);
      }
    }
    this.jobs.clear();
  }
}

// ═══════════════════════════════════════════════════
// DELAY HELPER
// ═══════════════════════════════════════════════════

/**
 * Promise tabanlı delay — retry/backoff için
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exponential backoff delay hesapla
 */
function calculateBackoff(attempt: number, baseDelayMs: number = 1000, strategy: 'fixed' | 'exponential' = 'exponential'): number {
  if (strategy === 'fixed') return baseDelayMs;
  return baseDelayMs * Math.pow(2, attempt);
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export { DelayedQueue, delay, calculateBackoff };
export type { DelayedJob };