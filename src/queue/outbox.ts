// ═══════════════════════════════════════════════════
// AEGIS — Outbox Pattern
// DB işlemi ile Event/Queue yazmayı aynı transaction'da garanti altına alır.
// ═══════════════════════════════════════════════════

import type { IOutbox, OutboxEntry } from './types.js';
import type { IQueue, IStore } from '../types.js';

// ──── OUTBOX ─────────────────────────────────────

class Outbox implements IOutbox {
  private store: IStore;
  private queue: IQueue;
  private outboxPrefix = 'outbox:';
  private processingInterval: NodeJS.Timeout | null = null;
  private pollIntervalMs: number;

  constructor(store: IStore, queue: IQueue, pollIntervalMs: number = 1000) {
    this.store = store;
    this.queue = queue;
    this.pollIntervalMs = pollIntervalMs;
  }

  // ══════════════════════════════════════════════

  /**
   * Event'i outbox'a yaz
   * DB transaction içinde çağrılmalı
   */
  async publish(aggregateId: string, eventType: string, payload: unknown): Promise<void> {
    const id = `outbox_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const entry: OutboxEntry = {
      id,
      aggregateId,
      eventType,
      payload,
      status: 'pending',
      createdAt: Date.now(),
    };

    const key = this.outboxPrefix + id;
    await this.store.set(key, JSON.stringify(entry));
  }

  // ══════════════════════════════════════════════

  /**
   * Bekleyen event'leri işle
   * Polling ile çalışır, kendi interval'ını yönetir
   */
  async process(handler: (entry: OutboxEntry) => Promise<void>): Promise<void> {
    // TODO: Gerçek implementasyonda store'dan pending entry'leri çek
    // Şimdilik basit polling yapısı
  }

  // ══════════════════════════════════════════════

  /**
   * Polling'i başlat
   */
  startPolling(handler: (entry: OutboxEntry) => Promise<void>): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(async () => {
      await this.processPending(handler);
    }, this.pollIntervalMs);
  }

  // ══════════════════════════════════════════════

  /**
   * Polling'i durdur
   */
  stopPolling(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  // ══════════════════════════════════════════════

  /**
   * Başarısız event'leri tekrar dene
   */
  async retryFailed(): Promise<void> {
    // TODO: failed entry'leri bul ve tekrar pending yap
  }

  // ══════════════════════════════════════════════

  /**
   * Outbox istatistikleri
   */
  async getStats(): Promise<{ pending: number; failed: number; published: number }> {
    // TODO: Gerçek implementasyon
    return { pending: 0, failed: 0, published: 0 };
  }

  // ══════════════════════════════════════════════
  // PRIVATE
  // ══════════════════════════════════════════════

  private async processPending(handler: (entry: OutboxEntry) => Promise<void>): Promise<void> {
    // Basit implementasyon — gerçekte store'dan sayfalama ile çekilmeli
    try {
      // Her poll'da bir batch işle
      // Şimdilik placeholder
    } catch (error) {
      // Log error, continue polling
    }
  }
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export { Outbox };