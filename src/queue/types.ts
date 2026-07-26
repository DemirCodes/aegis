// ═══════════════════════════════════════════════════
// AEGIS — Queue Types
// Kuyruk yönetimi için temel tipler
// ═══════════════════════════════════════════════════

// ──── QUEUE JOB ───────────────────────────────────

type QueuePriority = 'critical' | 'high' | 'medium' | 'low' | 'background';

type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';

interface QueueJob {
  id: string;
  name: string;
  data: unknown;
  priority: QueuePriority;
  status: JobStatus;
  attemptsMade: number;
  maxAttempts: number;
  createdAt: number;
  processedAt?: number;
  completedAt?: number;
  failedAt?: number;
  error?: string;
}

// ──── QUEUE OPTIONS ──────────────────────────────

interface QueueAddOptions {
  priority?: QueuePriority;
  delay?: number;           // ms gecikme
  attempts?: number;         // max deneme
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  timeout?: number;          // ms
  jobId?: string;
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
  groupKey?: string;         // sticky queue için
}

// ──── QUEUE INTERFACE ────────────────────────────

interface IQueue {
  /** Kuyruğa iş ekle */
  add(name: string, data: unknown, options?: QueueAddOptions): Promise<string>;

  /** Kuyruktan iş al ve işle */
  process(name: string, handler: (job: QueueJob) => Promise<void>, concurrency?: number): void;

  /** Kuyruğu duraklat */
  pause(name: string): Promise<void>;

  /** Kuyruğu devam ettir */
  resume(name: string): Promise<void>;

  /** Kuyruğu temizle */
  clean(name: string, gracePeriodMs?: number): Promise<void>;

  /** Kuyruk bilgisi */
  getStats(name: string): Promise<QueueStats>;

  /** Tüm kuyruk bilgileri */
  getAllStats(): Promise<Record<string, QueueStats>>;

  /** Job detayı */
  getJob(name: string, jobId: string): Promise<QueueJob | null>;

  /** Job iptal et */
  removeJob(name: string, jobId: string): Promise<void>;
}

// ──── QUEUE STATS ────────────────────────────────

interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  workers: number;
}

// ──── DEAD LETTER ────────────────────────────────

interface DeadLetterEntry {
  id: string;
  originalQueue: string;
  job: QueueJob;
  reason: string;
  failedAt: number;
  replayable: boolean;
}

interface IDeadLetterQueue {
  /** DLQ'ya ekle */
  send(queue: string, job: QueueJob, reason: string): Promise<void>;

  /** DLQ'daki işlemleri listele */
  list(options?: { limit?: number; offset?: number; queue?: string }): Promise<DeadLetterEntry[]>;

  /** DLQ'dan ana kuyruğa geri besle (replay) */
  replay(id: string, options?: { rateLimit?: number; backoff?: boolean }): Promise<void>;

  /** DLQ'dan sil */
  remove(id: string): Promise<void>;

  /** DLQ istatistikleri */
  getStats(): Promise<{ total: number; replayable: number }>;
}

// ──── BATCH ──────────────────────────────────────

interface BatchOptions {
  maxBatchSize: number;
  maxWindowMs: number;
  priority?: QueuePriority;
}

interface IStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<boolean>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlMs: number): Promise<boolean>;
}


interface IBatchQueue {
  /** Batch'e iş ekle */
  add<T>(name: string, fn: () => Promise<T>, options?: BatchOptions): Promise<T>;

  /** Bekleyen batch'leri zorla işle */
  flush(name: string): Promise<void>;
}


interface BatchItem<T> {
  fn: () => Promise<T>;  // data yerine fn
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

// ──── SCHEDULED ──────────────────────────────────

interface ScheduledJob {
  id: string;
  cron: string;
  queue: string;
  data: unknown;
  nextRunAt?: number;
  lastRunAt?: number;
  enabled: boolean;
}

interface IScheduledQueue {
  /** Cron ile iş planla */
  schedule(id: string, cron: string, queue: string, data: unknown): Promise<void>;

  /** Planlanmış işi iptal et */
  cancel(id: string): Promise<void>;

  /** Planlanmış işleri listele */
  list(): Promise<ScheduledJob[]>;
}

// ──── DISTRIBUTED LOCK ────────────────────────────

interface IDistributedLock {
  /** Kilidi al */
  acquire(resource: string, ttlMs: number): Promise<boolean>;

  /** Kilidi serbest bırak */
  release(resource: string): Promise<void>;

  /** Kilit altında işlem yap */
  withLock<T>(resource: string, ttlMs: number, fn: () => Promise<T>): Promise<T>;
}

// ──── LEADER ELECTION ────────────────────────────

interface ILeaderElection {
  /** Lider miyim? */
  isLeader(group: string, ttlMs?: number): Promise<boolean>;

  /** Liderlik yarışına gir */
  elect(group: string, ttlMs?: number): Promise<void>;

  /** Liderlikten çekil */
  resign(group: string): Promise<void>;

  /** Lider değişimini dinle */
  onLeadershipChange(group: string, callback: (isLeader: boolean) => void): void;
}

// ──── WORKER SCALING ─────────────────────────────

interface WorkerScalingOptions {
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  maxWorkers: number;
  minWorkers: number;
  cooldownMs: number;
}

interface IWorkerScaling {
  /** Queue uzunluğuna göre scale önerisi */
  evaluate(queueStats: Record<string, QueueStats>): ScaleAction | null;

  /** Scale event dinle */
  on(event: 'scale:up' | 'scale:down', callback: (action: ScaleAction) => void): void;
}

interface ScaleAction {
  action: 'up' | 'down';
  current: number;
  target: number;
  reason: string;
}

// ──── OUTBOX ──────────────────────────────────────

interface OutboxEntry {
  id: string;
  aggregateId: string;
  eventType: string;
  payload: unknown;
  status: 'pending' | 'published' | 'failed';
  createdAt: number;
  publishedAt?: number;
}

interface IOutbox {
  /** Event'i outbox'a yaz */
  publish(aggregateId: string, eventType: string, payload: unknown): Promise<void>;

  /** Bekleyen event'leri işle */
  process(handler: (entry: OutboxEntry) => Promise<void>): Promise<void>;

  /** Başarısız event'leri tekrar dene */
  retryFailed(): Promise<void>;
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export type {
  QueuePriority,
  JobStatus,
  QueueJob,
  QueueAddOptions,
  IQueue,
  QueueStats,
  DeadLetterEntry,
  IDeadLetterQueue,
  BatchOptions,
  IBatchQueue,
  ScheduledJob,
  IScheduledQueue,
  IDistributedLock,
  ILeaderElection,
  WorkerScalingOptions,
  IWorkerScaling,
  ScaleAction,
  OutboxEntry,
  IOutbox,
};