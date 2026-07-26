// ═══════════════════════════════════════════════════
// AEGIS — Scheduled Queue
// Cron tabanlı zamanlanmış işler.
// ═══════════════════════════════════════════════════

import type { ScheduledJob, IScheduledQueue, IQueue } from './types.js';

// ──── SCHEDULED JOB STORE ────────────────────────

interface ScheduledEntry {
  id: string;
  cron: string;
  queue: string;
  data: unknown;
  enabled: boolean;
  nextRunAt: number;
  lastRunAt?: number;
  timer?: NodeJS.Timeout;
}

// ──── CRON PARSER (Basit) ────────────────────────

/**
 * Basit cron parser — sadece dakika ve saat bazlı
 * Format: "dakika saat * * *"
*/
function parseCronToNextMs(cron: string): number {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 2) {
    throw new Error(`Invalid cron format: ${cron}. Expected at least minute and hour.`);
  }

  const [minutePart, hourPart] = parts;
  const now = new Date();
  const currentMinute = now.getMinutes();
  const currentHour = now.getHours();

  let nextMinute = currentMinute;
  let nextHour = currentHour;
  let addDay = false;

  // Dakika hesapla
  if (minutePart === '*') {
    nextMinute = currentMinute + 1;
  } else if (minutePart?.startsWith('*/')) {
    const interval = parseInt(minutePart.slice(2), 10);
    nextMinute = Math.ceil(currentMinute / interval) * interval;
  } else {
    nextMinute = parseInt(minutePart!, 10);
  }

  // Saat hesapla
  if (hourPart === '*') {
    if (nextMinute <= currentMinute) {
      nextHour = currentHour + 1;
    }
  } else if (hourPart?.startsWith('*/')) {
    const interval = parseInt(hourPart.slice(2), 10);
    nextHour = Math.ceil(currentHour / interval) * interval;
    if (nextHour === currentHour && nextMinute <= currentMinute) {
      nextHour += interval;
    }
  } else {
    nextHour = parseInt(hourPart!, 10);
    if (nextHour < currentHour || (nextHour === currentHour && nextMinute <= currentMinute)) {
      addDay = true;
    }
  }

  // Dakika taşması
  if (nextMinute >= 60) {
    nextHour += Math.floor(nextMinute / 60);
    nextMinute = nextMinute % 60;
  }

  // Saat taşması
  if (nextHour >= 24) {
    nextHour = nextHour % 24;
    addDay = true;
  }

  const next = new Date(now);
  next.setMinutes(nextMinute, 0, 0);
  next.setHours(nextHour);

  if (addDay) {
    next.setDate(next.getDate() + 1);
  }

  const diffMs = next.getTime() - now.getTime();
  return Math.max(0, diffMs);
}

// ──── SCHEDULED QUEUE ────────────────────────────

class ScheduledQueue implements IScheduledQueue {
  private jobs = new Map<string, ScheduledEntry>();
  private targetQueue: IQueue;

  constructor(targetQueue: IQueue) {
    this.targetQueue = targetQueue;
  }

  // ══════════════════════════════════════════════

  async schedule(id: string, cron: string, queue: string, data: unknown): Promise<void> {
    // Varsa eski zamanlayıcıyı iptal et
    await this.cancel(id);

    const nextRunAt = Date.now() + parseCronToNextMs(cron);

    const entry: ScheduledEntry = {
      id,
      cron,
      queue,
      data,
      enabled: true,
      nextRunAt,
    };

    this.scheduleNext(entry);
    this.jobs.set(id, entry);
  }

  // ══════════════════════════════════════════════

  async cancel(id: string): Promise<void> {
    const entry = this.jobs.get(id);
    if (entry?.timer) {
      clearTimeout(entry.timer);
    }
    this.jobs.delete(id);
  }

  // ══════════════════════════════════════════════

  async list(): Promise<ScheduledJob[]> {
    return Array.from(this.jobs.values()).map(e => ({
      id: e.id,
      cron: e.cron,
      queue: e.queue,
      data: e.data,
      nextRunAt: e.nextRunAt,
      lastRunAt: e.lastRunAt,
      enabled: e.enabled,
    }));
  }

  // ══════════════════════════════════════════════

  /**
   * Tüm zamanlanmış işleri durdur
   */
  destroy(): void {
    for (const entry of this.jobs.values()) {
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
    }
    this.jobs.clear();
  }

  // ══════════════════════════════════════════════
  // PRIVATE
  // ══════════════════════════════════════════════

  private scheduleNext(entry: ScheduledEntry): void {
    const delayMs = Math.max(0, entry.nextRunAt - Date.now());

    entry.timer = setTimeout(async () => {
      if (!entry.enabled) return;

      // Ana kuyruğa ekle
      await this.targetQueue.add(entry.queue, entry.data, {
        priority: 'medium',
        jobId: `scheduled_${entry.id}_${Date.now()}`,
      });

      entry.lastRunAt = Date.now();

      // Sonraki çalışmayı planla
      entry.nextRunAt = Date.now() + parseCronToNextMs(entry.cron);
      this.scheduleNext(entry);
    }, delayMs);
  }
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export { ScheduledQueue, parseCronToNextMs };