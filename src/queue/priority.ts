// ═══════════════════════════════════════════════════
// AEGIS — Priority Queue
// İşlemleri önceliğe göre sıralar.
// critical > high > medium > low > background
// ═══════════════════════════════════════════════════

import type { QueuePriority, QueueJob, QueueAddOptions, IQueue, QueueStats } from './types.js';

// ──── PRIORITY SIRALAMASI ────────────────────────

const PRIORITY_ORDER: Record<QueuePriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  background: 4,
};

// ──── JOB STORE ──────────────────────────────────

interface PriorityJob {
  id: string;
  name: string;
  data: unknown;
  priority: QueuePriority;
  status: QueueJob['status'];
  attemptsMade: number;
  maxAttempts: number;
  createdAt: number;
  processedAt?: number;
  completedAt?: number;
  failedAt?: number;
  error?: string;
  delay?: number;
  groupKey?: string;
}

// ──── IN-MEMORY QUEUE ────────────────────────────

class PriorityQueue implements IQueue {
  private queues = new Map<string, PriorityJob[]>();
  private handlers = new Map<string, (job: QueueJob) => Promise<void>>();
  private concurrency = new Map<string, number>();
  private active = new Map<string, number>();
  private paused = new Set<string>();
  private completed = new Map<string, number>();
  private failed = new Map<string, number>();

  // ══════════════════════════════════════════════

  async add(name: string, data: unknown, options?: QueueAddOptions): Promise<string> {
    const id = options?.jobId || `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const priority = options?.priority || 'medium';
    const maxAttempts = options?.attempts || 3;

    const job: PriorityJob = {
      id,
      name,
      data,
      priority,
      status: options?.delay ? 'delayed' : 'waiting',
      attemptsMade: 0,
      maxAttempts,
      createdAt: Date.now(),
      delay: options?.delay,
      groupKey: options?.groupKey,
    };

    if (!this.queues.has(name)) {
      this.queues.set(name, []);
    }

    const queue = this.queues.get(name)!;

    if (options?.delay) {
      // Delayed — süresi gelince waiting'e al
      setTimeout(() => {
        job.status = 'waiting';
        job.delay = undefined;
        this.sortQueue(queue);
        this.processNext(name);
      }, options.delay);
    }

    queue.push(job);
    this.sortQueue(queue);

    // İşlemi başlat
    setImmediate(() => this.processNext(name));

    return id;
  }

  // ══════════════════════════════════════════════

  process(name: string, handler: (job: QueueJob) => Promise<void>, concurrency: number = 1): void {
    this.handlers.set(name, handler);
    this.concurrency.set(name, concurrency);
    this.active.set(name, 0);
    this.completed.set(name, 0);
    this.failed.set(name, 0);

    setImmediate(() => this.processNext(name));
  }

  // ══════════════════════════════════════════════

  async pause(name: string): Promise<void> {
    this.paused.add(name);
  }

  async resume(name: string): Promise<void> {
    this.paused.delete(name);
    setImmediate(() => this.processNext(name));
  }

  async clean(name: string, gracePeriodMs: number = 0): Promise<void> {
    const queue = this.queues.get(name);
    if (!queue) return;

    const now = Date.now();
    this.queues.set(name, queue.filter(job => {
      if (job.status === 'completed' || job.status === 'failed') {
        const age = now - (job.completedAt || job.failedAt || 0);
        return age < gracePeriodMs;
      }
      return true;
    }));
  }

  // ══════════════════════════════════════════════

  async getStats(name: string): Promise<QueueStats> {
    const queue = this.queues.get(name) || [];
    const waiting = queue.filter(j => j.status === 'waiting' && !j.delay).length;
    const active = this.active.get(name) || 0;
    const completed = this.completed.get(name) || 0;
    const failed = this.failed.get(name) || 0;
    const delayed = queue.filter(j => j.status === 'delayed' || !!j.delay).length;
    const paused = this.paused.has(name);

    return {
      name,
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
      workers: this.concurrency.get(name) || 0,
    };
  }

  async getAllStats(): Promise<Record<string, QueueStats>> {
    const stats: Record<string, QueueStats> = {};
    for (const name of this.queues.keys()) {
      stats[name] = await this.getStats(name);
    }
    return stats;
  }

  // ══════════════════════════════════════════════

  async getJob(name: string, jobId: string): Promise<QueueJob | null> {
    const queue = this.queues.get(name);
    if (!queue) return null;
    return queue.find(j => j.id === jobId) || null;
  }

  async removeJob(name: string, jobId: string): Promise<void> {
    const queue = this.queues.get(name);
    if (!queue) return;
    this.queues.set(name, queue.filter(j => j.id !== jobId));
  }

  // ══════════════════════════════════════════════
  // PRIVATE
  // ══════════════════════════════════════════════

  private sortQueue(queue: PriorityJob[]): void {
    queue.sort((a, b) => {
      // Önce priority
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;

      // Sonra oluşturma zamanı (FIFO)
      return a.createdAt - b.createdAt;
    });
  }

  private async processNext(name: string): Promise<void> {
    if (this.paused.has(name)) return;

    const maxConcurrency = this.concurrency.get(name) || 1;
    const currentActive = this.active.get(name) || 0;
    const handler = this.handlers.get(name);

    if (!handler || currentActive >= maxConcurrency) return;

    const queue = this.queues.get(name);
    if (!queue) return;

    // İşlenecek ilk waiting job'ı bul
    const jobIndex = queue.findIndex(j => j.status === 'waiting' && !j.delay);
    if (jobIndex === -1) return;

    const job = queue[jobIndex]!;
    job.status = 'active';
    job.processedAt = Date.now();
    this.active.set(name, currentActive + 1);

    try {
      await handler(job as QueueJob);
      job.status = 'completed';
      job.completedAt = Date.now();
      this.completed.set(name, (this.completed.get(name) || 0) + 1);
    } catch (error: any) {
      job.attemptsMade++;
      job.error = error?.message;

      if (job.attemptsMade < job.maxAttempts) {
        job.status = 'waiting';
      } else {
        job.status = 'failed';
        job.failedAt = Date.now();
        this.failed.set(name, (this.failed.get(name) || 0) + 1);
      }
    } finally {
      this.active.set(name, (this.active.get(name) || 1) - 1);
      this.sortQueue(queue);
      setImmediate(() => this.processNext(name));
    }
  }
}

// ═══════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════

const priorityQueue = new PriorityQueue();

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export { PriorityQueue, priorityQueue, PRIORITY_ORDER };