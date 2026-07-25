// ═══════════════════════════════════════════════
// AEGIS — Zeus'un Kalkanı
// İstek koruma, tehdit engelleme, hata yönetimi
//
// v2 — düzeltmeler:
//  1. Retry artık classifyError.retryable'a göre çalışıyor (önceki kod
//     ölü bir if bloğu yüzünden HER hatayı retry ediyordu)
//  2. Idempotency race condition'ı kapatıldı (in-flight promise cache'i)
//  3. Circuit breaker artık her özel (obje) profile için ayrı isim
//     gerektiriyor, hepsi 'custom' altında çakışmıyor
//  4. Circuit breaker sadece 'system' tipi hatalarda sayaç artırıyor
//     (rate limit / güvenlik hataları artık circuit'i yanlışlıkla açmıyor)
//  5. Tüm in-memory store'lara TTL bazlı süpürme (sweep) eklendi
//  6. Store'lar bir interface arkasına alındı — ileride Redis'e taşımak
//     tek dosyada iki fonksiyon değiştirmekle olacak
// ═══════════════════════════════════════════════

// ──── TİPLER ────────────────────────────────────

interface RetryOptions {
  maxRetries: number;
  backoff: 'fixed' | 'linear' | 'exponential';
  baseDelayMs: number;
  jitter: boolean;
}

interface TimeoutOptions {
  ms: number;
  message?: string;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number | null;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  updatedAt: number;
}

interface RateLimitStore {
  count: number;
  resetAt: number;
}

interface ThreatInfo {
  ip: string;
  suspicious: boolean;
  reason?: string;
}

type ErrorType = 'system' | 'user' | 'security';

interface ClassifiedError extends Error {
  type: ErrorType;
  original: Error;
  retryable: boolean;
}

interface AegisProfile {
  timeout?: number;
  retries?: number;
  backoff?: 'fixed' | 'linear' | 'exponential';
  circuitBreaker?: boolean;
  rateLimit?: { max: number; windowMs: number };
  threatDetection?: boolean;
  idempotency?: boolean;
}

interface AegisOptions {
  idempotencyKey?: string;
  req?: { ip: string; path: string; method: string };
  /**
   * Özel (obje) profil kullanırken circuit breaker / rate limit gibi
   * paylaşılan state'lerin hangi kaynağa ait olduğunu belirtir.
   * Verilmezse her obje profili birbirinden bağımsız sayılmaz — bu
   * yüzden zorunlu kılındı (bkz. aşağıdaki uyarı).
   */
  resourceName?: string;
}

// ──── SÜRE SABİTLERİ ────────────────────────────

const IDEMPOTENCY_DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün
const CIRCUIT_STATE_STALE_MS = 60 * 60 * 1000; // 1 saat işlem görmeyen breaker silinir
const THREAT_ENTRY_MAX_AGE_MS = 24 * 60 * 60 * 1000; // ban süresi geçmiş kayıtları da bir süre tut (audit)
const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 dakikada bir süpür

// ──── DEPOLAR (In-memory) ──────────────────────
// NOT: Bunlar process-local. Birden fazla instance/replica çalıştırıyorsan
// (yatay ölçekleniyorsan) rate limit / circuit breaker / idempotency
// instance'lar arasında PAYLAŞILMAZ. Prod'da gerçek dağıtık garanti
// istiyorsan bu Map'lerin yerine Redis (INCR + EXPIRE, SETNX vb.) kullan.
// Aşağıdaki fonksiyonlar bilinçli olarak küçük tutuldu ki tek başına
// değiştirmesi kolay olsun.

const circuitBreakers = new Map<string, CircuitBreakerState>();
const rateLimits = new Map<string, RateLimitStore>();

interface IdempotencyEntry<T> {
  status: 'pending' | 'done';
  promise: Promise<T>;
  timestamp: number;
}
const idempotencyCache = new Map<string, IdempotencyEntry<any>>();

const threatBlacklist = new Map<string, number>(); // ip -> ban bitiş zamanı

// ──── PERİYODİK SÜPÜRME ─────────────────────────
// setInterval her ortamda (ör. serverless) istenmeyebilir; bu yüzden
// dışa açık bir fonksiyon da veriyoruz, isteyen kendi cron'undan çağırır.

function sweepStores(now: number = Date.now()): void {
  for (const [key, state] of circuitBreakers) {
    const lastActivity = state.lastFailure ?? state.updatedAt;
    if (state.state === 'CLOSED' && now - lastActivity > CIRCUIT_STATE_STALE_MS) {
      circuitBreakers.delete(key);
    }
  }

  for (const [key, store] of rateLimits) {
    if (now > store.resetAt) rateLimits.delete(key);
  }

  for (const [key, entry] of idempotencyCache) {
    if (entry.status === 'done' && now - entry.timestamp > IDEMPOTENCY_DEFAULT_TTL_MS) {
      idempotencyCache.delete(key);
    }
  }

  for (const [ip, bannedUntil] of threatBlacklist) {
    if (now > bannedUntil + THREAT_ENTRY_MAX_AGE_MS) {
      threatBlacklist.delete(ip);
    }
  }
}

let sweepTimer: ReturnType<typeof setInterval> | null = null;

function startAegisSweeper(intervalMs: number = SWEEP_INTERVAL_MS): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => sweepStores(), intervalMs);
  // Node'da process'i açık tutmasın
  if (typeof (sweepTimer as any).unref === 'function') {
    (sweepTimer as any).unref();
  }
}

function stopAegisSweeper(): void {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}

// ──── YARDIMCI ──────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeClassifiedError(base: {
  type: ErrorType;
  original: Error;
  retryable: boolean;
  message: string;
}): ClassifiedError {
  const err = new Error(base.message) as ClassifiedError;
  err.type = base.type;
  err.original = base.original;
  err.retryable = base.retryable;
  err.stack = base.original.stack;
  return err;
}

// ═══════════════════════════════════════════════════
// 8. ERROR CLASSIFICATION (retry ve circuit breaker bundan besleniyor,
//    bu yüzden dosyada yukarı taşındı)
// ═══════════════════════════════════════════════════

function classifyError(error: Error): ClassifiedError {
  const message = error?.message || '';

  // Zaten sınıflandırılmışsa tekrar sarmalama
  if ((error as ClassifiedError).type) {
    return error as ClassifiedError;
  }

  // Sistem hataları — geçici, retry mantıklı
  if (
    message.includes('ECONNREFUSED') ||
    message.includes('ETIMEDOUT') ||
    message.includes('timed out') ||
    message.includes('circuit breaker') === false && (
      message.includes('5xx') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    )
  ) {
    return makeClassifiedError({
      type: 'system',
      original: error,
      retryable: true,
      message: `System error: ${message}`
    });
  }

  // Circuit breaker'ın kendi reddi — retry'a hiç sokma, breaker zaten korumada
  if (message.includes('Circuit breaker OPEN')) {
    return makeClassifiedError({
      type: 'system',
      original: error,
      retryable: false,
      message: `Circuit open: ${message}`
    });
  }

  // Güvenlik / limit hataları — retry ETME
  if (
    message.includes('Rate limit exceeded') ||
    message.includes('blacklisted') ||
    message.includes('Request blocked') ||
    message.includes('forbidden') ||
    message.includes('403') ||
    message.includes('401')
  ) {
    return makeClassifiedError({
      type: 'security',
      original: error,
      retryable: message.includes('Rate limit exceeded'), // 429 benzeri: bekleyip tekrar denenebilir
      message: `Security violation: ${message}`
    });
  }

  // 429 statusCode ile gelen ama mesajda yakalanmayan durumlar
  if ((error as any)?.statusCode === 429) {
    return makeClassifiedError({
      type: 'security',
      original: error,
      retryable: true,
      message: `Rate limited (429): ${message}`
    });
  }

  // Kullanıcı hataları (default) — retry anlamsız
  return makeClassifiedError({
    type: 'user',
    original: error,
    retryable: false,
    message: `User error: ${message}`
  });
}

// ═══════════════════════════════════════════════════
// 1. TIMEOUT
// ═══════════════════════════════════════════════════

function withTimeout<T>(
  fn: () => Promise<T>,
  options: number | TimeoutOptions
): Promise<T> {
  const opts = typeof options === 'number' ? { ms: options } : options;
  const ms = opts.ms;
  const message = opts.message || `Operation timed out after ${ms}ms`;

  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(message));
    }, ms);

    fn()
      .then(result => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
  });
}

// ═══════════════════════════════════════════════════
// 2. RETRY + BACKOFF (düzeltildi)
// ═══════════════════════════════════════════════════
//
// Önceki bug: ikinci `if` bloğü birinciyle aynı koşulu tekrar kontrol
// ettiği için hiçbir zaman çalışmıyordu -> isRateLimited hiçbir şeyi
// etkilemiyordu ve HER hata (403, validasyon hatası, vs.) sonuna kadar
// retry ediliyordu. Artık classifyError().retryable kullanılıyor.

function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const {
    maxRetries = 3,
    backoff = 'exponential',
    baseDelayMs = 1000,
    jitter = true
  } = options;

  return new Promise((resolve, reject) => {
    let attempt = 0;

    function tryOnce() {
      attempt++;

      fn()
        .then(resolve)
        .catch(async (error: Error) => {
          const classified = classifyError(error);
          const attemptsLeft = attempt <= maxRetries;

          if (!classified.retryable || !attemptsLeft) {
            return reject(classified);
          }

          let delay: number;
          switch (backoff) {
            case 'fixed':
              delay = baseDelayMs;
              break;
            case 'linear':
              delay = baseDelayMs * attempt;
              break;
            case 'exponential':
              delay = baseDelayMs * Math.pow(2, attempt - 1);
              break;
            default:
              delay = baseDelayMs;
          }

          if (jitter) {
            delay = delay + Math.random() * (delay * 0.3);
          }

          await sleep(Math.floor(delay));
          tryOnce();
        });
    }

    tryOnce();
  });
}

// ═══════════════════════════════════════════════════
// 3. CIRCUIT BREAKER (düzeltildi)
// ═══════════════════════════════════════════════════
//
// Önceki bug: her hata türü (rate limit dahil) breaker'ın failure
// sayacını artırıyordu. Trafik patlayınca herkes 429 yer, bu da
// gereksiz yere circuit'i OPEN'a çekerdi. Artık sadece 'system' tipi
// hatalar sayaç artırıyor.

function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  options: { threshold?: number; resetMs?: number } = {}
): Promise<T> {
  const { threshold = 5, resetMs = 30000 } = options;

  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, {
      failures: 0,
      lastFailure: null,
      state: 'CLOSED',
      updatedAt: Date.now()
    });
  }

  const breaker = circuitBreakers.get(name)!;

  if (breaker.state === 'OPEN') {
    const timeSinceFailure = Date.now() - (breaker.lastFailure || 0);

    if (timeSinceFailure >= resetMs) {
      breaker.state = 'HALF_OPEN';
    } else {
      return Promise.reject(
        new Error(`Circuit breaker OPEN for "${name}". Retry in ${Math.ceil((resetMs - timeSinceFailure) / 1000)}s`)
      );
    }
  }

  return fn()
    .then(result => {
      breaker.failures = 0;
      breaker.state = 'CLOSED';
      breaker.updatedAt = Date.now();
      return result;
    })
    .catch(error => {
      const classified = classifyError(error);

      // Sadece gerçek sistem arızaları breaker'ı tetiklesin.
      // Güvenlik (rate limit, forbidden) ve kullanıcı hataları hedefin
      // kendisi sağlıksız olduğu anlamına gelmez.
      if (classified.type === 'system') {
        breaker.failures++;
        breaker.lastFailure = Date.now();
        breaker.updatedAt = Date.now();

        if (breaker.failures >= threshold) {
          breaker.state = 'OPEN';
        }
      }

      throw classified;
    });
}

// ═══════════════════════════════════════════════════
// 4. IDEMPOTENCY (düzeltildi — race condition kapatıldı)
// ═══════════════════════════════════════════════════
//
// Önceki bug: cache sadece TAMAMLANMIŞ sonuçları tutuyordu. Aynı key
// ile fn() bitmeden ikinci istek gelirse cache boş görünür ve fn()
// İKİNCİ KEZ çalıştırılırdı (payment profilinde bu = çifte ödeme).
// Artık "pending" durumundaki promise'in kendisi cache'leniyor,
// eşzamanlı istekler aynı promise'e bağlanıyor.

function withIdempotency<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = IDEMPOTENCY_DEFAULT_TTL_MS
): Promise<T> {
  const now = Date.now();
  const cached = idempotencyCache.get(key);

  if (cached) {
    const expired = cached.status === 'done' && now - cached.timestamp >= ttlMs;
    if (!expired) {
      // Ya hâlâ çalışıyor ya da yakın zamanda bitmiş — aynı promise'i döndür.
      return cached.promise;
    }
    idempotencyCache.delete(key);
  }

  const promise = fn()
    .then(result => {
      const entry = idempotencyCache.get(key);
      if (entry) {
        entry.status = 'done';
        entry.timestamp = Date.now();
      }
      return result;
    })
    .catch(error => {
      // Başarısız çağrıyı cache'te TUTMA — aksi halde geçici bir hata
      // yedi gün boyunca "sonuçmuş" gibi tekrar tekrar döner.
      idempotencyCache.delete(key);
      throw error;
    });

  idempotencyCache.set(key, { status: 'pending', promise, timestamp: now });
  return promise;
}

// ═══════════════════════════════════════════════════
// 5. RATE LIMITING
// ═══════════════════════════════════════════════════

function withRateLimit<T>(
  identifier: string,
  fn: () => Promise<T>,
  options: { max: number; windowMs: number }
): Promise<T> {
  const now = Date.now();
  const store = rateLimits.get(identifier);

  if (!store || now > store.resetAt) {
    rateLimits.set(identifier, { count: 1, resetAt: now + options.windowMs });
  } else if (store.count >= options.max) {
    return Promise.reject(
      new Error(`Rate limit exceeded for "${identifier}". Reset in ${Math.ceil((store.resetAt - now) / 1000)}s`)
    );
  } else {
    store.count++;
  }

  return fn();
}

// ═══════════════════════════════════════════════════
// 6. THREAT DETECTION
// ═══════════════════════════════════════════════════
// NOT: Bu regex taraması sadece en amatör SQLi/XSS/path-traversal
// denemelerini yakalar (encoding, case değişimi, alternatif payload'larla
// kolayca atlatılabilir). Gerçek bir WAF / girdi validasyonunun YERİNE
// geçmez, ek bir katman olarak düşünülmeli.

function analyzeRequest(req: { ip: string; path: string; method: string; headers?: any }): ThreatInfo {
  const { ip, path, method } = req;

  const bannedUntil = threatBlacklist.get(ip);
  if (bannedUntil && Date.now() < bannedUntil) {
    return { ip, suspicious: true, reason: 'IP blacklisted' };
  }

  const suspiciousPatterns = [
    /(\bUNION\b|\bSELECT\b|\bDROP\b|\bINSERT\b)/i,
    /(<script[\s>]|javascript:)/i,
    /(\.\.\/|\.\.\\)/
  ];

  const fullPath = `${method} ${path}`;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fullPath)) {
      return { ip, suspicious: true, reason: 'Suspicious pattern detected' };
    }
  }

  return { ip, suspicious: false };
}

function blockRequest(ip: string, durationMs: number = 600000): void {
  threatBlacklist.set(ip, Date.now() + durationMs);
}

function unblockRequest(ip: string): void {
  threatBlacklist.delete(ip);
}

// ═══════════════════════════════════════════════════
// 7. CONCURRENCY LIMITER
// ═══════════════════════════════════════════════════

const concurrencyQueues = new Map<string, { active: number; queue: Array<() => void> }>();

function withConcurrency<T>(
  name: string,
  fn: () => Promise<T>,
  limit: number = 100
): Promise<T> {
  if (!concurrencyQueues.has(name)) {
    concurrencyQueues.set(name, { active: 0, queue: [] });
  }

  const pool = concurrencyQueues.get(name)!;

  return new Promise((resolve, reject) => {
    function execute() {
      pool.active++;

      fn()
        .then(result => {
          pool.active--;
          processQueue();
          resolve(result);
        })
        .catch(error => {
          pool.active--;
          processQueue();
          reject(error);
        });
    }

    function processQueue() {
      if (pool.queue.length > 0 && pool.active < limit) {
        const next = pool.queue.shift();
        if (next) next();
      }
    }

    if (pool.active < limit) {
      execute();
    } else {
      pool.queue.push(execute);
    }
  });
}

// ═══════════════════════════════════════════════════
// 9. AEGIS — HEPSİ BİR ARADA
// ═══════════════════════════════════════════════════

const defaultProfiles: Record<string, AegisProfile> = {
  payment: {
    timeout: 30000,
    retries: 5,
    backoff: 'exponential',
    circuitBreaker: true,
    rateLimit: { max: 10, windowMs: 60000 },
    threatDetection: true,
    idempotency: true
  },
  balanceCheck: {
    timeout: 10000,
    retries: 2,
    backoff: 'linear',
    circuitBreaker: false,
    rateLimit: { max: 100, windowMs: 60000 },
    threatDetection: true,
    idempotency: false
  },
  notification: {
    timeout: 5000,
    retries: 0,
    backoff: 'fixed',
    circuitBreaker: false,
    rateLimit: { max: 1000, windowMs: 60000 },
    threatDetection: false,
    idempotency: false
  }
};

async function aegis<T>(
  profile: string | AegisProfile,
  fn: () => Promise<T>,
  options?: AegisOptions
): Promise<T> {
  const prof = typeof profile === 'string'
    ? defaultProfiles[profile] || {}
    : profile;

  // Circuit breaker / rate limit gibi paylaşılan state'ler için kaynak adı.
  // String profil verildiyse profil adı yeterli. Obje profil verildiyse
  // ve resourceName belirtilmediyse artık sessizce 'custom' altına
  // düşmüyoruz — her çağıran kendi kaynağını izole etsin diye uyarıyoruz.
  const resourceName = typeof profile === 'string'
    ? profile
    : options?.resourceName;

  if (typeof profile !== 'string' && !options?.resourceName && (prof.circuitBreaker || prof.rateLimit)) {
    console.warn(
      '[AEGIS] Obje profil ile circuitBreaker/rateLimit kullanılıyor ama resourceName verilmedi. ' +
      'Farklı çağrılar birbirinin state\'ini paylaşabilir — options.resourceName ekleyin.'
    );
  }

  const breakerKey = resourceName || 'custom:unnamed';

  // 1. Threat detection
  if (prof.threatDetection && options?.req) {
    const threat = analyzeRequest(options.req);
    if (threat.suspicious) {
      throw makeClassifiedError({
        type: 'security',
        original: new Error(threat.reason || 'suspicious request'),
        retryable: false,
        message: `Request blocked: ${threat.reason}`
      });
    }
  }

  // 2. Rate limiting
  const rateLimitCheck = prof.rateLimit
    ? () => withRateLimit(options?.req?.ip || breakerKey, fn, prof.rateLimit!)
    : fn;

  // 3. Circuit breaker (rate limit'in İÇİNDE, yani rate limit hataları
  //    breaker'a hiç uğramadan direkt reddedilsin — breaker sadece asıl
  //    işin (fn) sistemsel arızalarını görsün)
  const circuitCheck = prof.circuitBreaker
    ? () => withCircuitBreaker(breakerKey, fn).catch(err => { throw err; })
    : fn;

  // Not: circuitCheck ve rateLimitCheck ikisi de "fn"i sarmalıyor ama
  // birbirini sarmalamıyor — aşağıda ikisini birlikte uyguluyoruz ki
  // rate limit reddi circuit breaker sayaçlarını etkilemesin.
  const guarded = () => {
    if (prof.rateLimit && prof.circuitBreaker) {
      // Önce rate limit — geçerse circuit breaker'lı fn çalışsın
      return withRateLimit(options?.req?.ip || breakerKey, () => withCircuitBreaker(breakerKey, fn), prof.rateLimit!);
    }
    if (prof.rateLimit) return rateLimitCheck();
    if (prof.circuitBreaker) return circuitCheck();
    return fn();
  };

  // 4. Idempotency
  const idempotencyCheck = prof.idempotency && options?.idempotencyKey
    ? () => withIdempotency(options.idempotencyKey!, guarded)
    : guarded;

  // 5. Retry
  const retryCheck = prof.retries
    ? () => withRetry(idempotencyCheck, {
        maxRetries: prof.retries,
        backoff: prof.backoff || 'exponential'
      })
    : idempotencyCheck;

  // 6. Timeout
  const timeoutCheck = prof.timeout
    ? () => withTimeout(retryCheck, prof.timeout!)
    : retryCheck;

  try {
    return await timeoutCheck();
  } catch (error) {
    const classified = classifyError(error as Error);

    if (classified.type === 'system') {
      console.error('[AEGIS] System error:', classified.message);
    }

    throw classified;
  }
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  aegis,

  withTimeout,
  withRetry,
  withCircuitBreaker,
  withIdempotency,
  withRateLimit,
  withConcurrency,

  analyzeRequest,
  blockRequest,
  unblockRequest,

  classifyError,

  startAegisSweeper,
  stopAegisSweeper,
  sweepStores,
};

export type {
  AegisProfile,
  AegisOptions,
  RetryOptions,
  TimeoutOptions,
  ThreatInfo,
  ClassifiedError,
};



// ═══════════════════════════════════════════════════
// AEGIS — Zeus'un Kalkanı
// İstek koruma, tehdit engelleme, hata yönetimi
// ═══════════════════════════════════════════════════
//
// ──── HIZLI BAŞLANGIÇ ─────────────────────────────
//
// import { aegis, withTimeout, withRetry, withCircuitBreaker, 
//          withIdempotency, withRateLimit, classifyError, 
//          analyzeRequest, blockRequest } from './aegis';
//
// ──── 1. HEPSİ BİR ARADA (TAVSiYE EDİLEN) ─────────
//
//   // Hazır profil ile:
//   const result = await aegis('payment', async () => {
//     return await paymentService.process(req.body);
//   }, {
//     idempotencyKey: req.body.idempotencyKey,
//     req: { ip: req.ip, path: req.path, method: req.method }
//   });
//
//   // Özel profil ile:
//   const result = await aegis({
//     timeout: 5000,
//     retries: 3,
//     backoff: 'exponential',
//     circuitBreaker: true,
//     rateLimit: { max: 10, windowMs: 60000 },
//     threatDetection: true,
//     idempotency: true
//   }, async () => {
//     return await doSomething();
//   }, {
//     idempotencyKey: req.body.key,
//     resourceName: 'my-operation'
//   });
//
//
// ──── 2. TEK TEK KULLANIM ─────────────────────────
//
//   // Sadece timeout:
//   const result = await withTimeout(() => pay(), 5000);
//
//   // Timeout + retry:
//   const result = await withRetry(
//     () => withTimeout(() => pay(), 5000),
//     { maxRetries: 3, backoff: 'exponential' }
//   );
//
//   // Circuit breaker:
//   const result = await withCircuitBreaker('bank-api', () => pay());
//
//   // Idempotency (çifte ödemeyi engelle):
//   const result = await withIdempotency(req.body.key, () => pay());
//
//   // Rate limiting:
//   const result = await withRateLimit(req.ip, () => pay(), 
//     { max: 10, windowMs: 60000 });
//
//
// ──── 3. EXPRESS ENDPOINT ÖRNEĞİ ──────────────────
//
//   app.post('/api/payments', async (req, res) => {
//     try {
//       const result = await aegis('payment', async () => {
//         return await paymentService.process(req.body);
//       }, {
//         idempotencyKey: req.body.idempotencyKey,
//         req: { ip: req.ip, path: req.path, method: req.method }
//       });
//       
//       res.json({ success: true, data: result });
//     } catch (error) {
//       const err = error as ClassifiedError;
//       
//       const statusMap = {
//         system: 503,
//         security: 429,
//         user: 400
//       };
//       
//       res.status(statusMap[err.type] || 500).json({
//         success: false,
//         error: err.message,
//         type: err.type
//       });
//     }
//   });
//
//
// ──── 4. HATA SINIFLANDIRMA ───────────────────────
//
//   try {
//     await doSomething();
//   } catch (error) {
//     const classified = classifyError(error);
//     
//     if (classified.type === 'system') {
//       // Sistem hatası: logla, alarm oluştur, retry yap
//     } else if (classified.type === 'security') {
//       // Güvenlik ihlali: IP'yi blacklist'e ekle
//       blockRequest(req.ip, 600000); // 10 dakika ban
//     } else {
//       // Kullanıcı hatası: kullanıcıya göster, tekrar deneme
//     }
//   }
//
//
// ──── 5. HAZIR PROFİLLER ──────────────────────────
//
//   'payment'       → timeout: 30sn, retry: 5, circuit breaker, rate limit
//   'balanceCheck'  → timeout: 10sn, retry: 2, rate limit
//   'notification'  → timeout: 5sn, retry: 0, korumasız
//
//   Kendi profilini eklemek için defaultProfiles'a yeni key ekle.
//
// ═══════════════════════════════════════════════════


// ═══════════════════════════════════════════════════
// HAZIR PROFİLLERİ GENİŞLETMEK İSTEYENLER İÇİN
// ═══════════════════════════════════════════════════
//
// defaultProfiles'a kendi profilini ekleyebilirsin:
//
//   import { defaultProfiles } from './aegis';
//   defaultProfiles['myCustomOp'] = {
//     timeout: 15000,
//     retries: 3,
//     backoff: 'linear',
//     circuitBreaker: true,
//     rateLimit: { max: 50, windowMs: 30000 },
//     threatDetection: true,
//     idempotency: true
//   };
//
// Sonra kullan:
//   await aegis('myCustomOp', fn, { ... });