// ═══════════════════════════════════════════════════
// AEGIS — Zeus'un Kalkanı
// Core Types — Tüm modüllerin kullandığı temel tipler
// ═══════════════════════════════════════════════════

// ──── ERROR TYPES ──────────────────────────────────

/** Hata tipleri — classifyError() bu tiplere göre karar verir */
type ErrorType = 'system' | 'user' | 'security';

/** Sınıflandırılmış hata — orijinal hatayı sarar, ek metadata taşır */
interface ClassifiedError extends Error {
  type: ErrorType;
  original: Error;
  retryable: boolean;
}

// ──── TIMEOUT TYPES ────────────────────────────────

interface TimeoutOptions {
  ms: number;
  message?: string;
}

// ──── RETRY TYPES ─────────────────────────────────

type BackoffStrategy = 'fixed' | 'linear' | 'exponential';

interface RetryOptions {
  maxRetries: number;
  backoff: BackoffStrategy;
  baseDelayMs: number;
  jitter: boolean;
}

// ──── CIRCUIT BREAKER TYPES ───────────────────────

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerState {
  failures: number;
  lastFailure: number | null;
  state: CircuitState;
  updatedAt: number;
}

interface CircuitBreakerOptions {
  threshold?: number;
  resetMs?: number;
}

// ──── RATE LIMITER TYPES ──────────────────────────

type RateLimitAlgorithm = 'fixed-window' | 'sliding-window' | 'token-bucket';

interface RateLimitOptions {
  max: number;
  windowMs: number;
  algorithm?: RateLimitAlgorithm;
}

interface RateLimitStore {
  count: number;
  resetAt: number;
}

// ──── BULKHEAD TYPES ──────────────────────────────

interface BulkheadOptions {
  maxConcurrent: number;
  maxQueueSize?: number;
}

// ──── IDEMPOTENCY TYPES ───────────────────────────

interface IdempotencyEntry<T = unknown> {
  status: 'pending' | 'done';
  promise: Promise<T>;
  timestamp: number;
}

// ──── FALLBACK TYPES ──────────────────────────────

type FallbackFunction<T> = (error: Error) => Promise<T> | T;

// ──── THREAT DETECTION TYPES ──────────────────────

interface ThreatInfo {
  ip: string;
  suspicious: boolean;
  reason?: string;
}

// ──── AEGIS PROFILE TYPES ─────────────────────────

type ImportanceLevel = 'critical' | 'high' | 'medium' | 'low' | 'background';
type FallbackStrategy = 'error' | 'queue' | 'cache' | 'ignore' | 'compensating_transaction';
type CacheStampedeStrategy = 'stale-while-revalidate' | 'promise-cache';

interface AegisProfile {
  timeout?: number;
  retries?: number;
  backoff?: BackoffStrategy;
  circuitBreaker?: boolean | CircuitBreakerOptions;
  rateLimit?: RateLimitOptions;
  bulkhead?: BulkheadOptions;
  idempotency?: boolean | { ttl?: number };
  fallback?: { type: FallbackStrategy; message?: string };
  threatDetection?: boolean;
  deduplication?: boolean;
  importance?: ImportanceLevel;
  cacheStampede?: { ttlMs: number; strategy: CacheStampedeStrategy };
  schema?: unknown; // Zod schema
}

interface AegisOptions {
  idempotencyKey?: string;
  req?: {
    ip: string;
    path: string;
    method: string;
    headers?: Record<string, string>;
  };
  resourceName?: string;
  metadata?: Record<string, unknown>;
}

// ──── STORE INTERFACES ────────────────────────────

interface IStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlMs: number): Promise<void>;
}

// ──── QUEUE INTERFACES ────────────────────────────

interface IQueue {
  add(name: string, data: unknown, options?: QueueAddOptions): Promise<string>;
  process(name: string, handler: (job: QueueJob) => Promise<void>): void;
}

interface QueueAddOptions {
  delay?: number;
  priority?: number;
  attempts?: number;
  backoff?: { type: 'fixed' | 'exponential'; delay: number };
}

interface QueueJob {
  id: string;
  data: unknown;
  attemptsMade: number;
}

// ──── LOGGER INTERFACES ───────────────────────────

interface ILogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

// ──── METRICS INTERFACES ──────────────────────────

interface IMetrics {
  counter(name: string, value: number, labels?: Record<string, string>): void;
  gauge(name: string, value: number, labels?: Record<string, string>): void;
  histogram(name: string, value: number, labels?: Record<string, string>): void;
}

// ──── AUDIT INTERFACES ────────────────────────────

interface IAudit {
  log(action: string, data: Record<string, unknown>): Promise<void>;
  query(filters: AuditFilters): Promise<AuditEntry[]>;
}

interface AuditFilters {
  action?: string;
  userId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

interface AuditEntry {
  id: string;
  action: string;
  data: Record<string, unknown>;
  userId?: string;
  ip?: string;
  timestamp: Date;
}

// ──── CACHE INTERFACES ────────────────────────────

interface ICache {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// ──── AEGIS INSTANCE ──────────────────────────────

interface AegisInstance {
  execute<T>(profile: string | AegisProfile, fn: () => Promise<T>, options?: AegisOptions): Promise<T>;
  health(): Promise<AegisHealth>;
  metrics(): Promise<string>;
}

interface AegisHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  circuitBreakers: Record<string, CircuitBreakerState>;
  queues: Record<string, { size: number; active: number }>;
  rateLimits: Record<string, RateLimitStore>;
}

// ──── CREATE AEGIS ────────────────────────────────

interface CreateAegisOptions {
  store?: IStore;
  queue?: IQueue;
  logger?: ILogger;
  metrics?: IMetrics;
  audit?: IAudit;
  cache?: ICache;
  profiles?: Record<string, AegisProfile>;
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export type {
  ErrorType,
  ClassifiedError,
  TimeoutOptions,
  BackoffStrategy,
  RetryOptions,
  CircuitState,
  CircuitBreakerState,
  CircuitBreakerOptions,
  RateLimitAlgorithm,
  RateLimitOptions,
  RateLimitStore,
  BulkheadOptions,
  IdempotencyEntry,
  FallbackFunction,
  ThreatInfo,
  ImportanceLevel,
  FallbackStrategy,
  CacheStampedeStrategy,
  AegisProfile,
  AegisOptions,
  IStore,
  IQueue,
  QueueAddOptions,
  QueueJob,
  ILogger,
  IMetrics,
  IAudit,
  AuditFilters,
  AuditEntry,
  ICache,
  AegisInstance,
  AegisHealth,
  CreateAegisOptions,
};