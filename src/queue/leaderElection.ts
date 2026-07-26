// ═══════════════════════════════════════════════════
// AEGIS — Leader Election
// Scheduled Queue için lider seçimi.
// 5 sunucudan sadece 1'i görevi üstlenir.
// ═══════════════════════════════════════════════════

import type { ILeaderElection } from './types.js';
import type { IStore } from '../types.js';

// ──── LEADER ELECTION ────────────────────────────

class LeaderElection implements ILeaderElection {
  private store: IStore;
  private leaderPrefix = 'leader:';
  private heartbeatInterval: number;
  private instanceId: string;
  private heartbeats = new Map<string, NodeJS.Timeout>();
  private listeners = new Map<string, Array<(isLeader: boolean) => void>>();

  constructor(store: IStore, heartbeatIntervalMs: number = 5000) {
    this.store = store;
    this.heartbeatInterval = heartbeatIntervalMs;
    this.instanceId = `${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  // ══════════════════════════════════════════════

  /**
   * Şu an lider ben miyim?
   */
  async isLeader(group: string, ttlMs: number = 15000): Promise<boolean> {
    const key = this.leaderPrefix + group;
    const currentLeader = await this.store.get(key);
    return currentLeader === this.instanceId;
  }

  // ══════════════════════════════════════════════

  /**
   * Liderlik yarışına gir
   * Kazanırsa heartbeat başlatır
   */
  async elect(group: string, ttlMs: number = 15000): Promise<void> {
    const key = this.leaderPrefix + group;

    const currentLeader = await this.store.get(key);

    if (currentLeader && currentLeader !== this.instanceId) {
      const ttl = await this.getLeaderTTL(group);
      if (ttl && ttl > 0) {
        this.notifyListeners(group, false);
        return;
      }
    }

    // set'in dönüşünü boolean'a cast et
    const won = await this.store.set(key, this.instanceId, ttlMs) as unknown as boolean;

    if (won) {
      this.startHeartbeat(group, ttlMs);
      this.notifyListeners(group, true);
    }
  }

  // ══════════════════════════════════════════════

  /**
   * Liderlikten çekil
   */
  async resign(group: string): Promise<void> {
    const key = this.leaderPrefix + group;

    if (await this.isLeader(group)) {
      await this.store.del(key);
      this.stopHeartbeat(group);
      this.notifyListeners(group, false);
    }
  }

  // ══════════════════════════════════════════════

  /**
   * Lider değişimini dinle
   */
  onLeadershipChange(group: string, callback: (isLeader: boolean) => void): void {
    if (!this.listeners.has(group)) {
      this.listeners.set(group, []);
    }
    this.listeners.get(group)!.push(callback);
  }

  // ══════════════════════════════════════════════

  /**
   * Tüm liderlikleri temizle
   */
  async destroy(): Promise<void> {
    for (const group of this.heartbeats.keys()) {
      await this.resign(group);
    }
    this.listeners.clear();
  }

  // ══════════════════════════════════════════════
  // PRIVATE
  // ══════════════════════════════════════════════

  private startHeartbeat(group: string, ttlMs: number): void {
    this.stopHeartbeat(group);

    const interval = setInterval(async () => {
      const key = this.leaderPrefix + group;
      const currentLeader = await this.store.get(key);

      if (currentLeader !== this.instanceId) {
        // Liderlik kaybedildi
        this.stopHeartbeat(group);
        this.notifyListeners(group, false);
        return;
      }

      // Liderliği tazele
      await this.store.set(key, this.instanceId, ttlMs);
    }, this.heartbeatInterval);

    this.heartbeats.set(group, interval);
  }

  private stopHeartbeat(group: string): void {
    const interval = this.heartbeats.get(group);
    if (interval) {
      clearInterval(interval);
      this.heartbeats.delete(group);
    }
  }

  private notifyListeners(group: string, isLeader: boolean): void {
    const listeners = this.listeners.get(group);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(isLeader);
        } catch {
          // Listener hatası diğerlerini etkilemesin
        }
      }
    }
  }

  private async getLeaderTTL(group: string): Promise<number | null> {
    const key = this.leaderPrefix + group;
    const exists = await this.store.exists(key);
    return exists ? 1 : null;
  }
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export { LeaderElection };