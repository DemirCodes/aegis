// ═══════════════════════════════════════════════════
// AEGIS — Sticky Queue
// Aynı kaynağa (userId, accountId) giden işleri
// aynı worker'a yönlendirir. Sıralama garantisi.
// ═══════════════════════════════════════════════════

import type { IQueue, QueueAddOptions, QueueJob } from './types.js';

// ──── STICKY STORE ───────────────────────────────

interface StickyGroup {
  groupKey: string;
  queue: string;
  jobs: QueueJob[];
  processing: boolean;
}

// ──── STICKY QUEUE ───────────────────────────────

class StickyQueue {
  private groups = new Map<string, StickyGroup>();
  private targetQueue: IQueue;
  private handler?: (job: QueueJob) => Promise<void>;

  constructor(targetQueue: IQueue) {
    this.targetQueue = targetQueue;
  }

  // ══════════════════════════════════════════════

  /**
   * Sticky gruba iş ekle
   * Aynı groupKey'e sahip işler sırayla işlenir
   */
  async add(
    name: string,
    data: unknown,
    groupKey: string,
    options?: QueueAddOptions
  ): Promise<string> {
    const id = options?.jobId || `sticky_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const job: QueueJob = {
      id,
      name,
      data,
      priority: options?.priority || 'medium',
      status: 'waiting',
      attemptsMade: 0,
      maxAttempts: options?.attempts || 3,
      createdAt: Date.now(),
    };

    const groupId = `${name}:${groupKey}`;

    if (!this.groups.has(groupId)) {
      this.groups.set(groupId, {
        groupKey,
        queue: name,
        jobs: [],
        processing: false,
      });
    }

    const group = this.groups.get(groupId)!;
    group.jobs.push(job);

    // İşlemi başlat
    if (!group.processing) {
      this.processGroup(groupId);
    }

    return id;
  }

  // ══════════════════════════════════════════════

  /**
   * Sticky işleyiciyi kaydet
   */
  process(handler: (job: QueueJob) => Promise<void>): void {
    this.handler = handler;
  }

  // ══════════════════════════════════════════════

  /**
   * Grup istatistikleri
   */
  getStats(): { groupId: string; queue: string; pending: number; processing: boolean }[] {
    return Array.from(this.groups.entries()).map(([groupId, group]) => ({
      groupId,
      queue: group.queue,
      pending: group.jobs.length,
      processing: group.processing,
    }));
  }

  // ══════════════════════════════════════════════

  /**
   * Belirli bir grubu temizle
   */
  clearGroup(groupKey: string, queue?: string): void {
    const groupId = queue ? `${queue}:${groupKey}` : groupKey;
    this.groups.delete(groupId);
  }

  // ══════════════════════════════════════════════

  /**
   * Tüm grupları temizle
   */
  destroy(): void {
    this.groups.clear();
  }

  // ══════════════════════════════════════════════
  // PRIVATE
  // ══════════════════════════════════════════════

  private async processGroup(groupId: string): Promise<void> {
    const group = this.groups.get(groupId);
    if (!group || group.processing) return;

    group.processing = true;

    while (group.jobs.length > 0) {
      const job = group.jobs[0]!;

      if (!this.handler) {
        // Handler yoksa ana kuyruğa gönder
        await this.targetQueue.add(group.queue, job.data, {
          priority: job.priority,
          attempts: job.maxAttempts,
          jobId: job.id,
        });
        group.jobs.shift();
        continue;
      }

      try {
        await this.handler(job);
        group.jobs.shift(); // Başarılı, sıradakine geç
      } catch (error) {
        job.attemptsMade++;
        if (job.attemptsMade >= job.maxAttempts) {
          // Max deneme aşıldı, işi düşür
          group.jobs.shift();
        }
        // Hata olsa da aynı gruba devam et
        // Başarısız iş tekrar denenir (kuyruğun başında kalır)
      }
    }

    group.processing = false;
    this.groups.delete(groupId);
  }
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export { StickyQueue };