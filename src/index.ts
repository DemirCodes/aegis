// ═══════════════════════════════════════════════════
// AEGIS — Zeus'un Kalkanı
// Public API — Tüm export'lar burada toplanır
// ═══════════════════════════════════════════════════

// ──── ANA FONKSİYON ──────────────────────────────

export { createAegis, defaultProfiles } from './aegis.js';

// ──── CORE MODÜLLER ──────────────────────────────

export { withTimeout, sleep } from './core/timeout.js';
export { withRetry } from './core/retry.js';
export {
  withCircuitBreaker,
  getCircuitState,
  resetCircuit,
  getCircuitBreakers,
  sweepStaleBreakers,
} from './core/circuitBreaker.js';
export {
  withCascadingFailure,
  checkDependencies,
  areDependenciesHealthy,
} from './core/cascadingFailure.js';
export {
  withIdempotency,
  clearIdempotencyCache,
  getIdempotencyCacheSize,
  sweepStaleIdempotency,
} from './core/idempotency.js';
export {
  withRateLimit,
  getRateLimitCount,
  resetRateLimit,
  getRateLimits,
  sweepStaleRateLimits,
} from './core/rateLimiter.js';
export {
  withBulkhead,
  getBulkheadStats,
  resetBulkhead,
  getBulkheads,
} from './core/bulkhead.js';
export {
  withDeduplication,
  clearDeduplicationCache,
  getDeduplicationSize,
  sweepStaleDeduplication,
} from './core/deduplication.js';
export {
  withThrottling,
  getThrottleStats,
  resetThrottle,
  sweepStaleThrottles,
} from './core/throttling.js';
export {
  withFallback,
  errorMessageFallback,
  defaultFallback,
  nullFallback,
  logAndThrowFallback,
} from './core/fallback.js';
export {
  withSchemaValidation,
  withSchemaValidationSafe,
  validateSchema,
} from './core/schemaValidation.js';
export {
  withCacheStampede,
  clearStampedeCache,
  getStampedeCacheSize,
} from './core/cacheStampede.js';
export {
  withShadowTraffic,
} from './core/shadowTraffic.js';
export {
  detectPoisonPill,
  withPoisonPill,
} from './core/poisonPill.js';

// ──── HATA YÖNETİMİ ──────────────────────────────

export { classifyError, makeClassifiedError } from './core/errorClassifier.js';

// ──── TEHDİT TESPİTİ ─────────────────────────────

export {
  analyzeRequest,
  blockRequest,
  unblockRequest,
  isBlocked,
  getBlockedIPs,
  sweepStaleThreats,
} from './analysis/threatDetector.js';

// ──── TİPLER ─────────────────────────────────────

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
  ThrottlingOptions,
} from './types.js';

export type { SchemaLike, ValidationResult } from './core/schemaValidation.js';
export type { ShadowResult, ShadowOptions } from './core/shadowTraffic.js';
export type { PoisonPillOptions } from './core/poisonPill.js';
export type { CacheStampedeOptions } from './core/cacheStampede.js';
export type { CascadingOptions, DependencyHealth } from './core/cascadingFailure.js';
export type { RequestInfo } from './analysis/threatDetector.js';