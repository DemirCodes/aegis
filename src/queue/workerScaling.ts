// ═══════════════════════════════════════════════════
// AEGIS — Worker Scaling
// Queue uzunluğu eşiği aşınca K8s/Docker ortama
// "worker scale up" sinyali gönderir.
// ═══════════════════════════════════════════════════

import type { IWorkerScaling, WorkerScalingOptions, ScaleAction, QueueStats } from './types.js';

// ──── WORKER SCALING ─────────────────────────────

class WorkerScaling implements IWorkerScaling {
  private options: WorkerScalingOptions;
  private lastScaleTime = 0;
  private listeners: {
    'scale:up': Array<(action: ScaleAction) => void>;
    'scale:down': Array<(action: ScaleAction) => void>;
  } = {
    'scale:up': [],
    'scale:down': [],
  };

  constructor(options: WorkerScalingOptions) {
    this.options = {
      ...options,
    };
  }

  // ══════════════════════════════════════════════

  /**
   * Queue istatistiklerine göre scale kararı ver
   */
  evaluate(queueStats: Record<string, QueueStats>): ScaleAction | null {
    const now = Date.now();

    // Cooldown kontrolü
    if (now - this.lastScaleTime < this.options.cooldownMs) {
      return null;
    }

    // Toplam bekleyen iş sayısı
    let totalWaiting = 0;
    let totalActive = 0;

    for (const stats of Object.values(queueStats)) {
      totalWaiting += stats.waiting;
      totalActive += stats.active;
    }

    const totalLoad = totalWaiting + totalActive;
    const currentWorkers = this.getCurrentWorkers(queueStats);

    // Scale UP: Bekleyen işler eşiği aştıysa
    if (totalWaiting > this.options.scaleUpThreshold) {
      const targetWorkers = Math.min(
        currentWorkers * 2,
        this.options.maxWorkers
      );

      if (targetWorkers > currentWorkers) {
        this.lastScaleTime = now;

        const action: ScaleAction = {
          action: 'up',
          current: currentWorkers,
          target: targetWorkers,
          reason: `Waiting jobs (${totalWaiting}) exceeded threshold (${this.options.scaleUpThreshold})`,
        };

        this.emit('scale:up', action);
        return action;
      }
    }

    // Scale DOWN: Yük azaldıysa
    if (totalLoad < this.options.scaleDownThreshold && currentWorkers > this.options.minWorkers) {
      const targetWorkers = Math.max(
        Math.ceil(currentWorkers / 2),
        this.options.minWorkers
      );

      if (targetWorkers < currentWorkers) {
        this.lastScaleTime = now;

        const action: ScaleAction = {
          action: 'down',
          current: currentWorkers,
          target: targetWorkers,
          reason: `Load (${totalLoad}) below threshold (${this.options.scaleDownThreshold})`,
        };

        this.emit('scale:down', action);
        return action;
      }
    }

    return null;
  }

  // ══════════════════════════════════════════════

  /**
   * Scale event dinle
   */
  on(event: 'scale:up' | 'scale:down', callback: (action: ScaleAction) => void): void {
    this.listeners[event].push(callback);
  }

  // ══════════════════════════════════════════════

  /**
   * Options'ları güncelle
   */
  updateOptions(options: Partial<WorkerScalingOptions>): void {
    this.options = { ...this.options, ...options };
  }

  // ══════════════════════════════════════════════
  // PRIVATE
  // ══════════════════════════════════════════════

  private getCurrentWorkers(queueStats: Record<string, QueueStats>): number {
    let maxWorkers = 0;
    for (const stats of Object.values(queueStats)) {
      if (stats.workers > maxWorkers) {
        maxWorkers = stats.workers;
      }
    }
    return maxWorkers || this.options.minWorkers;
  }

  private emit(event: 'scale:up' | 'scale:down', action: ScaleAction): void {
    for (const callback of this.listeners[event]) {
      try {
        callback(action);
      } catch {
        // Listener hatası diğerlerini etkilemesin
      }
    }
  }
}

// ═══════════════════════════════════════════════════
// K8S HELPER
// ═══════════════════════════════════════════════════

/**
 * K8s HPA (Horizontal Pod Autoscaler) için metrik formatı
 */
function formatHPAMetrics(queueStats: Record<string, QueueStats>): Record<string, number> {
  let totalWaiting = 0;
  for (const stats of Object.values(queueStats)) {
    totalWaiting += stats.waiting;
  }
  return { queue_depth: totalWaiting };
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export { WorkerScaling, formatHPAMetrics };