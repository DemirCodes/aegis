// ═══════════════════════════════════════════════════
// AEGIS — Batch Queue
// İşlemleri gruplayarak toplu işler.
// Belirli sayıya veya süreye ulaşınca batch'i işler.
// ═══════════════════════════════════════════════════

import type { BatchOptions, IBatchQueue } from './types.js';

// ──── BATCH STORE ────────────────────────────────

interface BatchItem<T = unknown> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

interface BatchStore<T = unknown> {
  items: BatchItem<T>[];
  timer: NodeJS.Timeout | null;
}

// ──── BATCH QUEUE ────────────────────────────────

class BatchQueue implements IBatchQueue {
  private batches = new Map<string, BatchStore<any>>();
  private processors = new Map<string, (items: any[]) => Promise<any[]>>();

  // ══════════════════════════════════════════════

  register<T>(name: string, processor: (items: T[]) => Promise<T[]>): void {
    this.processors.set(name, processor);
  }

  // ══════════════════════════════════════════════

  async add<T>(
    name: string,
    fn: () => Promise<T>,
    options: BatchOptions = { maxBatchSize: 100, maxWindowMs: 5000 }
  ): Promise<T> {
    const processor = this.processors.get(name);
    if (!processor) {
      throw new Error(`No processor registered for batch: ${name}`);
    }

    if (!this.batches.has(name)) {
      this.batches.set(name, { items: [], timer: null });
    }

    const batch = this.batches.get(name)!;

    return new Promise((resolve, reject) => {
      batch.items.push({ fn, resolve, reject });

      if (batch.items.length >= options.maxBatchSize) {
        if (batch.timer) {
          clearTimeout(batch.timer);
          batch.timer = null;
        }
        this.flushBatch(name);
        return;
      }

      if (!batch.timer) {
        batch.timer = setTimeout(() => {
          batch.timer = null;
          this.flushBatch(name);
        }, options.maxWindowMs);
      }
    });
  }

  async flush(name: string): Promise<void> {
    await this.flushBatch(name);
  }

  async flushAll(): Promise<void> {
    const names = Array.from(this.batches.keys());
    await Promise.all(names.map(name => this.flushBatch(name)));
  }

  getStats(): { name: string; pending: number }[] {
    return Array.from(this.batches.entries()).map(([name, batch]) => ({
      name,
      pending: batch.items.length,
    }));
  }

  // ══════════════════════════════════════════════
  // PRIVATE
  // ══════════════════════════════════════════════

  private async flushBatch(name: string): Promise<void> {
    const batch = this.batches.get(name);
    if (!batch || batch.items.length === 0) return;

    if (batch.timer) {
      clearTimeout(batch.timer);
      batch.timer = null;
    }

    const items = [...batch.items];
    batch.items = [];

    const processor = this.processors.get(name);
    if (!processor) {
      items.forEach(item => item.reject(new Error(`No processor for batch: ${name}`)));
      return;
    }

    try {
      const results = await Promise.all(items.map(item => item.fn()));
      items.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      items.forEach(item => item.reject(err));
    }
  }

  destroy(): void {
    for (const batch of this.batches.values()) {
      if (batch.timer) {
        clearTimeout(batch.timer);
      }
      const err = new Error('Batch queue destroyed');
      batch.items.forEach(item => item.reject(err));
    }
    this.batches.clear();
    this.processors.clear();
  }
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export { BatchQueue };