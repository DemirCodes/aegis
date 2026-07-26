// ═══════════════════════════════════════════════════
// AEGIS — Zeus'un Kalkanı
// Ana fonksiyon. Tüm core modülleri profile göre zincirler.
// ═══════════════════════════════════════════════════

import type { AegisProfile, AegisOptions, AegisInstance, AegisHealth, CreateAegisOptions } from './types.js';
import { classifyError } from './core/errorClassifier.js';
import { withTimeout } from './core/timeout.js';
import { withRetry } from './core/retry.js';
import { withCircuitBreaker, getCircuitBreakers } from './core/circuitBreaker.js';
import { withCascadingFailure, areDependenciesHealthy } from './core/cascadingFailure.js';
import { withIdempotency } from './core/idempotency.js';
import { withRateLimit, getRateLimits } from './core/rateLimiter.js';
import { withBulkhead, getBulkheads } from './core/bulkhead.js';
import { withDeduplication } from './core/deduplication.js';
import { withFallback } from './core/fallback.js';
import { withThrottling } from './core/throttling.js';
import { withCacheStampede } from './core/cacheStampede.js';
import { withSchemaValidation } from './core/schemaValidation.js';
import { withPoisonPill } from './core/poisonPill.js';
import { withShadowTraffic } from './core/shadowTraffic.js';
import { analyzeRequest, blockRequest, isBlocked } from './analysis/threatDetector.js';

// ═══════════════════════════════════════════════════
// DEFAULT PROFILES
// ═══════════════════════════════════════════════════

const defaultProfiles: Record<string, AegisProfile> = {
  payment: {
    timeout: 30000,
    retries: 5,
    backoff: 'exponential',
    circuitBreaker: { threshold: 3, resetMs: 30000 },
    rateLimit: { max: 10, windowMs: 60000 },
    bulkhead: { maxConcurrent: 100 },
    idempotency: { ttl: 604800 },
    threatDetection: true,
    autoBlock: true,
    deduplication: true,
    importance: 'critical',
    fallback: { type: 'error', message: 'Ödeme şu anda alınamıyor' },
    shadowTraffic: false,
    dependencies: [],
  },
  balanceCheck: {
    timeout: 10000,
    retries: 2,
    backoff: 'linear',
    circuitBreaker: false,
    rateLimit: { max: 100, windowMs: 60000 },
    bulkhead: { maxConcurrent: 500 },
    idempotency: false,
    threatDetection: true,
    autoBlock: false,
    importance: 'medium',
    fallback: { type: 'cache' },
    shadowTraffic: false,
    dependencies: [],
  },
  notification: {
    timeout: 5000,
    retries: 0,
    backoff: 'fixed',
    circuitBreaker: false,
    rateLimit: { max: 1000, windowMs: 60000 },
    bulkhead: { maxConcurrent: 1000 },
    idempotency: false,
    threatDetection: false,
    autoBlock: false,
    importance: 'low',
    fallback: { type: 'ignore' },
    shadowTraffic: false,
    dependencies: [],
  },
};

// ═══════════════════════════════════════════════════
// CREATE AEGIS
// ═══════════════════════════════════════════════════

function createAegis(options: CreateAegisOptions = {}): AegisInstance {
  const profiles = { ...defaultProfiles, ...options.profiles };

  async function execute<T>(
    profile: string | AegisProfile,
    fn: () => Promise<T>,
    execOptions?: AegisOptions
  ): Promise<T> {
    const prof: AegisProfile = typeof profile === 'string' 
  ? profiles[profile] || ({} as AegisProfile) 
  : profile;
    const opts = execOptions || {};

    let guardedFn = fn;

    // ══════════════════════════════════════════════
    // 1. THREAT DETECTION
    // ══════════════════════════════════════════════
    if (prof.threatDetection && opts.req) {
      const threat = analyzeRequest(opts.req);
      if (threat.suspicious) {
        // Otomatik block (profilde autoBlock: true ise)
        if (prof.autoBlock) {
          blockRequest(opts.req.ip);
        }
        throw new Error(`Request blocked: ${threat.reason}`);
      }
    }

    // ══════════════════════════════════════════════
    // 2. SCHEMA VALIDATION
    // ══════════════════════════════════════════════
    if (prof.schema) {
      guardedFn = () => withSchemaValidation(prof.schema as any, guardedFn)(opts.metadata || {});
    }

    // ══════════════════════════════════════════════
    // 3. POISON PILL
    // ══════════════════════════════════════════════
    if (prof.poisonPill !== false) {
      guardedFn = () => withPoisonPill(guardedFn, { maxPayloadSize: 5 * 1024 * 1024 })(opts.metadata || {});
    }

    // ══════════════════════════════════════════════
    // 4. DEDUPLICATION
    // ══════════════════════════════════════════════
    if (prof.deduplication && opts.idempotencyKey) {
      const key = opts.idempotencyKey;
      guardedFn = () => withDeduplication(key, guardedFn);
    }

    // ══════════════════════════════════════════════
    // 5. IDEMPOTENCY
    // ══════════════════════════════════════════════
    if (prof.idempotency && opts.idempotencyKey) {
      const ttl = typeof prof.idempotency === 'object' ? prof.idempotency.ttl : undefined;
      const key = opts.idempotencyKey;
      guardedFn = () => withIdempotency(key, guardedFn, ttl);
    }

    // ══════════════════════════════════════════════
    // 6. RATE LIMITING
    // ══════════════════════════════════════════════
    if (prof.rateLimit) {
      const identifier = opts.req?.ip || opts.resourceName || 'global';
      guardedFn = () => withRateLimit(identifier, guardedFn, prof.rateLimit!);
    }

    // ══════════════════════════════════════════════
    // 7. THROTTLING
    // ══════════════════════════════════════════════
    if (prof.throttling) {
      const identifier = opts.req?.ip || opts.resourceName || 'global';
      guardedFn = () => withThrottling(identifier, guardedFn, prof.throttling!);
    }

    // ══════════════════════════════════════════════
    // 8. BULKHEAD
    // ══════════════════════════════════════════════
    if (prof.bulkhead) {
      const name = opts.resourceName || (typeof profile === 'string' ? profile : 'custom');
      guardedFn = () => withBulkhead(name, guardedFn, prof.bulkhead!);
    }

    // ══════════════════════════════════════════════
    // 9. CASCADING FAILURE (Circuit'ten ÖNCE)
    // ══════════════════════════════════════════════
    if (prof.dependencies && prof.dependencies.length > 0) {
      // Önce bağımlılıklar sağlıklı mı kontrol et
      const depsHealthy = areDependenciesHealthy(prof.dependencies);
      if (!depsHealthy) {
        throw new Error(
          `Cascading failure prevented: some dependencies are unhealthy: [${prof.dependencies.join(', ')}]`
        );
      }
      guardedFn = () => withCascadingFailure(guardedFn, prof.dependencies!);
    }

    // ══════════════════════════════════════════════
    // 10. CIRCUIT BREAKER
    // ══════════════════════════════════════════════
    if (prof.circuitBreaker) {
      const name = opts.resourceName || (typeof profile === 'string' ? profile : 'custom');
      const cbOptions = typeof prof.circuitBreaker === 'object' ? prof.circuitBreaker : {};
      guardedFn = () => withCircuitBreaker(name, guardedFn, cbOptions);
    }

    // ══════════════════════════════════════════════
    // 11. CACHE STAMPEDE
    // ══════════════════════════════════════════════
    if (prof.cacheStampede && opts.idempotencyKey) {
      guardedFn = () => withCacheStampede(guardedFn, {
        key: opts.idempotencyKey!,
        ttlMs: prof.cacheStampede!.ttlMs,
        strategy: prof.cacheStampede!.strategy,
      });
    }

    // ══════════════════════════════════════════════
    // 12. SHADOW TRAFFIC
    // ══════════════════════════════════════════════
    if (prof.shadowTraffic && prof.shadowFn) {
      guardedFn = () => withShadowTraffic(
        guardedFn, 
        prof.shadowFn as () => Promise<T>,  
        {
          timeoutMs: prof.timeout || 5000,
          compareResults: prof.compareShadowResults || false,
        }
      );
    }

    // ══════════════════════════════════════════════
    // 13. RETRY
    // ══════════════════════════════════════════════
    if (prof.retries) {
      guardedFn = () => withRetry(guardedFn, {
        maxRetries: prof.retries!,
        backoff: prof.backoff || 'exponential',
        jitter: true,
      });
    }

    // ══════════════════════════════════════════════
    // 14. TIMEOUT
    // ══════════════════════════════════════════════
    if (prof.timeout) {
      guardedFn = () => withTimeout(guardedFn, prof.timeout!);
    }

    // ══════════════════════════════════════════════
    // 15. FALLBACK
    // ══════════════════════════════════════════════
    if (prof.fallback) {
      const fallbackType = prof.fallback.type;
      const fallbackMessage = prof.fallback.message || 'Service temporarily unavailable';

      if (fallbackType === 'ignore') {
        guardedFn = () => withFallback(guardedFn, () => null as T);
      } else if (fallbackType === 'queue') {
        guardedFn = () => withFallback(guardedFn, () => {
          throw new Error(fallbackMessage);
        });
      } else if (fallbackType === 'compensating_transaction') {
        guardedFn = () => withFallback(guardedFn, async (error) => {
          console.error('[AEGIS] Compensating transaction triggered:', error.message);
          throw error;
        });
      } else {
        // error, cache, veya tanımsız
        guardedFn = () => withFallback(guardedFn, () => {
          throw new Error(fallbackMessage);
        });
      }
    }

    // ══════════════════════════════════════════════
    // EXECUTE
    // ══════════════════════════════════════════════
    try {
      return await guardedFn();
    } catch (error) {
      const classified = classifyError(error as Error);

      // Sadece sistem hatalarını logla
      if (classified.type === 'system') {
        console.error('[AEGIS] System error:', classified.message);
      }

      throw classified;
    }
  }

  // ════════════════════════════════════════════════
  // HEALTH
  // ════════════════════════════════════════════════
  async function health(): Promise<AegisHealth> {
    const breakers = getCircuitBreakers();
    const breakersObj: Record<string, any> = {};
    for (const [key, state] of breakers) {
      breakersObj[key] = state;
    }

    const limits = getRateLimits();
    const limitsObj: Record<string, any> = {};
    for (const [key, store] of limits) {
      limitsObj[key] = store;
    }

    const bulkheads = getBulkheads();
    const bulkheadsObj: Record<string, any> = {};
    for (const [key, stats] of bulkheads) {
      bulkheadsObj[key] = stats;
    }

    const allHealthy = Object.values(breakersObj).every((b: any) => b.state !== 'OPEN');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      circuitBreakers: breakersObj,
      queues: bulkheadsObj,
      rateLimits: limitsObj,
    };
  }

  // ════════════════════════════════════════════════
  // METRICS
  // ════════════════════════════════════════════════
  async function metrics(): Promise<string> {
    const h = await health();
    return [
      `# HELP aegis_uptime_seconds Aegis uptime`,
      `# TYPE aegis_uptime_seconds gauge`,
      `aegis_uptime_seconds ${h.uptime}`,
      `# HELP aegis_status Aegis health status`,
      `# TYPE aegis_status gauge`,
      `aegis_status ${h.status === 'healthy' ? 1 : 0}`,
    ].join('\n');
  }

  return { execute, health, metrics };
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export { createAegis, defaultProfiles };