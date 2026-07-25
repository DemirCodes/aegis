# AEGIS API REFERENCE

> Zeus'un Kalkanı — Bank-Ready Infrastructure Framework for Node.js
> Version: 0.1.0 | License: MIT
> Toplam Modül: 115

---

## 🛡️ CORE RESILIENCE (14 Modül)

### withTimeout(fn, options)
İşleme maksimum süre koyar. Süre dolunca işlem iptal edilir, kaynak serbest bırakılır.

Parametreler:
- fn: () => Promise<T> — Korunacak işlem
- options: number | TimeoutOptions — Maksimum süre (ms) veya { ms, message? }

Kullanım:
const result = await withTimeout(() => pay(), 5000);
const result = await withTimeout(() => pay(), { ms: 5000, message: 'Ödeme zaman aşımı' });

---

### withRetry(fn, options)
Başarısız işlemi otomatik tekrar dener. Exponential/Linear/Fixed backoff + jitter desteği. Sadece classifiyError().retryable === true olan hataları tekrar dener.

Parametreler:
- fn: () => Promise<T> — Korunacak işlem
- options: RetryOptions — { maxRetries, backoff, baseDelayMs, jitter }

Kullanım:
const result = await withRetry(() => pay(), { maxRetries: 5, backoff: 'exponential', jitter: true });

---

### withCircuitBreaker(name, fn, options)
Peş peşe hata alınınca devreyi keser. CLOSED → OPEN → HALF_OPEN. Sadece 'system' tipi hatalar sayacı artırır.

Parametreler:
- name: string — Breaker adı (state paylaşımı için)
- fn: () => Promise<T> — Korunacak işlem
- options: { threshold?, resetMs? } — Eşik (default: 5), reset süresi ms (default: 30000)

Kullanım:
const result = await withCircuitBreaker('bank-api', () => pay(), { threshold: 3, resetMs: 30000 });

---

### withCascadingFailure(fn, dependencies, options)
Bağımlı servislerin domino etkisiyle çökmesini engeller. Dependency'ler OPEN ise direkt reddeder, bağımlılık zincirini kırar.

Parametreler:
- fn: () => Promise<T> — Korunacak işlem
- dependencies: string[] — Bağlı olduğu circuit breaker isimleri
- options: { failFast?: boolean } — Hemen reddet (default: true)

Kullanım:
const result = await withCascadingFailure(() => pay(), ['bank-api', 'fraud-check']);

---

### withIdempotency(key, fn, ttlMs)
Aynı key ile gelen isteği sadece 1 kere işler. Pending promise cache ile race condition koruması.

Parametreler:
- key: string — Benzersiz işlem anahtarı
- fn: () => Promise<T> — İşlem
- ttlMs: number — Sonuç saklama süresi (default: 7 gün)

Kullanım:
const result = await withIdempotency(req.body.idempotencyKey, () => pay());

---

### withRateLimit(identifier, fn, options)
Aynı kaynaktan gelen istek sayısını sınırlar. Fixed window algoritması.

Parametreler:
- identifier: string — IP, userId gibi benzersiz tanımlayıcı
- fn: () => Promise<T> — İşlem
- options: { max: number, windowMs: number } — Pencere içinde max istek

Kullanım:
const result = await withRateLimit(req.ip, () => pay(), { max: 10, windowMs: 60000 });

---

### withBulkhead(name, fn, options)
Kaynak havuzu izolasyonu. Aynı anda max X işlem, fazlası kuyrukta bekler.

Parametreler:
- name: string — Havuz adı
- fn: () => Promise<T> — İşlem
- options: { maxConcurrent: number, maxQueueSize?: number }

Kullanım:
const result = await withBulkhead('db-pool', () => query(), { maxConcurrent: 100, maxQueueSize: 1000 });

---

### withDeduplication(key, fn, ttlMs)
Aynı anda gelen aynı istekleri tekilleştirir. İlk istek çalışır, diğerleri aynı promise'i bekler.

Parametreler:
- key: string — Benzersiz istek anahtarı
- fn: () => Promise<T> — İşlem
- ttlMs: number — Cache süresi

Kullanım:
const result = await withDeduplication(`${req.path}:${req.body.key}`, () => pay());

---

### withThrottling(identifier, fn, options)
Kademeli yavaşlatma. Banlamadan önce istekleri geciktirir.

Parametreler:
- identifier: string — Kaynak tanımlayıcı
- fn: () => Promise<T> — İşlem
- options: { max: number, windowMs: number, delayMs: number }

Kullanım:
const result = await withThrottling(req.ip, () => pay(), { max: 100, windowMs: 60000, delayMs: 1000 });

---

### withFallback(fn, fallbackFn)
Hata durumunda yedek plan devreye girer.

Parametreler:
- fn: () => Promise<T> — Ana işlem
- fallbackFn: (error: Error) => Promise<T> | T — Yedek işlem/değer

Kullanım:
const result = await withFallback(() => pay(), () => ({ status: 'pending', message: 'Daha sonra tekrar deneyin' }));

---

### withShadowTraffic(fn, shadowFn)
Canlı isteğin kopyasını test ortamına gönderir, sonuçları karşılaştırır. Ana işlem etkilenmez.

Parametreler:
- fn: () => Promise<T> — Ana işlem
- shadowFn: () => Promise<T> — Shadow işlem (sonucu karşılaştırılır)

Kullanım:
const result = await withShadowTraffic(() => payV1(), () => payV2());

---

### withPoisonPill(fn, options)
Parse edilirken CPU'yu %100 yapan zararlı payload'ları (XML Bomb, ReDoS, dev JSON) ana thread'e girmeden yakalar.

Parametreler:
- fn: () => Promise<T> — İşlem
- options: { maxPayloadSize?: number, maxParseTimeMs?: number }

Kullanım:
const result = await withPoisonPill(() => parse(req.body), { maxPayloadSize: 1048576, maxParseTimeMs: 1000 });

---

### withCacheStampede(fn, options)
Cache süresi dolduğunda oluşan Thundering Herd'ü engeller. Sadece 1 istek DB'ye gider, diğerleri bekler veya stale veri döner.

Parametreler:
- fn: () => Promise<T> — Cache miss durumunda çalışacak işlem
- options: { key: string, ttlMs: number, strategy: 'stale-while-revalidate' | 'promise-cache' }

Kullanım:
const result = await withCacheStampede(() => db.query('SELECT * FROM users'), { key: 'users:list', ttlMs: 60000, strategy: 'stale-while-revalidate' });

---

### withSchemaValidation(schema, fn)
İstek payload'unu Zod/Joi şeması ile doğrular. Geçemeyen istekler iç katmanlara ulaşamaz.

Parametreler:
- schema: ZodSchema — Doğrulama şeması
- fn: () => Promise<T> — İşlem

Kullanım:
const result = await withSchemaValidation(paymentSchema, () => pay(req.body));

---

## 📋 QUEUE MANAGEMENT (11 Modül)

### PriorityQueue
İşlemleri önceliğe göre sıralar: critical > high > medium > low > background.

Parametreler:
- priority: 'critical' | 'high' | 'medium' | 'low' | 'background'
- fn: () => Promise<T>

Kullanım:
const result = await priorityQueue.add('critical', () => pay());

---

### DelayedQueue
İşlemi X saniye sonra çalıştırır. Rate limit backoff için de kullanılır.

Parametreler:
- delayMs: number
- fn: () => Promise<T>

Kullanım:
const result = await delayedQueue.add(5000, () => pay());

---

### DeadLetterQueue
Max retry aşımına uğrayan işlemlerin düştüğü kuyruk. Manuel inceleme ve replay için.

Kullanım:
await dlq.send(job, { reason: 'Max retries exceeded', attempts: 5 });
const failedJobs = await dlq.list({ limit: 100 });

---

### ReplayEngine
DLQ'daki işlemleri ana kuyruğa geri besler. Rate limit'e takılmadan güvenli tekrar işleme.

Parametreler:
- jobId: string
- options: { rateLimit?: number, backoff?: boolean }

Kullanım:
await replayEngine.replay(jobId, { rateLimit: 10, backoff: true });

---

### BatchQueue
İşlemleri gruplayarak toplu işler. Belirli sayıya veya süreye ulaşınca batch'i işler.

Parametreler:
- fn: () => Promise<T>
- options: { maxBatchSize: number, maxWindowMs: number }

Kullanım:
const result = await batchQueue.add(() => sendEmail(), { maxBatchSize: 100, maxWindowMs: 5000 });

---

### ScheduledQueue
Belirli zamanda çalışacak işleri planlar (Cron benzeri).

Parametreler:
- cron: string — Cron expression
- fn: () => Promise<T>

Kullanım:
await scheduledQueue.add('0 3 * * *', () => dailyReport()); // Her gün 03:00

---

### StickyQueue
Aynı kaynağa (userId, accountId) giden işleri aynı worker'a yönlendirir. Sıralama garantisi.

Parametreler:
- groupKey: string
- fn: () => Promise<T>

Kullanım:
const result = await stickyQueue.add(userId, () => updateBalance());

---

### WorkerScaling
Queue uzunluğu eşiği aşınca Kubernetes/Docker ortama "worker scale up" sinyali gönderir.

Parametreler:
- queueName: string
- options: { scaleUpThreshold: number, scaleDownThreshold: number, maxWorkers: number }

Kullanım:
workerScaling.on('scale:up', ({ queueName, currentSize, targetSize }) => { /* K8s HPA trigger */ });

---

### OutboxPattern
DB işlemi ile Event/Queue yazmayı aynı transaction'da garanti altına alır.

Parametreler:
- db: PrismaClient
- event: { type: string, payload: any }

Kullanım:
await outbox.publish(db, { type: 'payment.completed', payload: { id: 123 } });

---

### DistributedLock (Redlock)
Redis tabanlı dağıtık kilit. Aynı kaynağa aynı anda sadece 1 worker erişebilir.

Parametreler:
- resource: string
- ttlMs: number
- fn: () => Promise<T>

Kullanım:
const result = await distributedLock.acquire('invoice:123', 30000, () => createInvoice());

---

### LeaderElection
Scheduled Queue çalıştırırken 5 sunucudan sadece 1'inin görevi üstlenmesini sağlar.

Parametreler:
- group: string
- ttlMs: number

Kullanım:
if (await leaderElection.isLeader('cron-scheduler')) { /* Sadece leader çalıştırır */ }

---

## 🔍 ANALYSIS & SECURITY (14 Modül)

### analyzeRequest(req)
İsteği analiz eder, şüpheli pattern'leri tespit eder. SQLi, XSS, path traversal kontrolü.

Parametreler:
- req: { ip: string, path: string, method: string, headers?: any }

Dönüş: ThreatInfo — { ip, suspicious: boolean, reason?: string }

---

### detectThreat(req)
IP blacklist + pattern analizi + anomaly skoru ile tehdit tespiti.

Parametreler:
- req: { ip: string, path: string, method: string, headers?: any, body?: any }

Dönüş: ThreatInfo

---

### blockRequest(ip, durationMs)
IP'yi blacklist'e ekler.

Parametreler:
- ip: string
- durationMs: number (default: 600000 = 10 dakika)

---

### unblockRequest(ip)
IP'yi blacklist'ten çıkarır.

---

### requestFingerprinting(req)
Aynı pattern tekrarını tespit eder. Headers, body shape, timing analizi.

Dönüş: { fingerprint: string, isRepeated: boolean, count: number }

---

### anomalyDetection(metric, value, options)
Normalin dışında trafik/ davranış tespiti. Z-score veya IQR tabanlı.

Parametreler:
- metric: string — Metrik adı
- value: number — Güncel değer
- options: { sensitivity: 'low' | 'medium' | 'high' }

Dönüş: { isAnomaly: boolean, score: number, threshold: number }

---

### geoFencing(req, options)
Ülke/bölge bazlı erişim kontrolü.

Parametreler:
- req: { ip: string }
- options: { allowedCountries?: string[], blockedCountries?: string[] }

---

### botDetection(req, options)
İstekler arası milisaniyelik sabit gecikmeleri (bot davranışı) tespit eder. Entropy/Variance Check.

Parametreler:
- req: { ip: string, timestamp: number }
- options: { minEntropy: number, windowSize: number }

Dönüş: { isBot: boolean, confidence: number }

---

### fieldLevelEncryption(data, fields, options)
Hassas alanları (email, creditCard, iban) otomatik şifreler/çözer. KVKK/GDPR uyumu.

Parametreler:
- data: Record<string, any>
- fields: string[] — Şifrelenecek alanlar
- options: { action: 'encrypt' | 'decrypt', algorithm?: 'aes-256-gcm' }

---

### wafEngine(req, rules)
OWASP kurallarını uygulama katmanında çalıştırır. SQLi, XSS, Command Injection, LFI/RFI.

Parametreler:
- req: Request
- rules: WAFRule[] — OWASP Core Rule Set veya custom

---

### apiSchemaEnforcement(req, schema)
OpenAPI/JSON Schema zorunluluğu. Şemaya uymayan istekler reddedilir.

Parametreler:
- req: Request
- schema: OpenAPISchema

---

### dataLossPrevention(data, policies)
Hassas verinin (kredi kartı, TC Kimlik, IBAN) dışarı sızmasını engeller.

Parametreler:
- data: any
- policies: DLPPolicy[] — Regex + aksiyon (block/mask/log)

---

### pciTokenization(cardData)
PCI DSS uyumlu kart verisi tokenizasyonu. Gerçek kart numarası yerine token saklanır.

Parametreler:
- cardData: { pan: string, cvv?: string, expiry?: string }

Dönüş: { token: string, last4: string, brand: string }

---

### gdprRightToErasure(userId)
Kullanıcının tüm verilerini GDPR uyumlu şekilde siler. Cascade delete + audit log.

Parametreler:
- userId: string
- options: { softDelete?: boolean, notifyDPO?: boolean }

---

## 📊 MONITORING & OBSERVABILITY (17 Modül)

### createAuditLog(prisma)
Prisma ile değiştirilemez denetim kaydı. Her işlem adımını kaydeder.

Parametreler:
- prisma: PrismaClient

Metodlar:
- audit.log(action, data): Promise<AuditEntry>
- audit.query(filters): Promise<AuditEntry[]>
- audit.generateReport(options): Promise<Report>

---

### createLogger(options)
Winston tabanlı structured logger. JSON formatında log.

Parametreler:
- options: { level, format, transports }

Metodlar:
- logger.info(message, meta)
- logger.warn(message, meta)
- logger.error(message, meta)
- logger.audit(message, meta) — Özel audit seviyesi

---

### createMetrics(options)
Prometheus uyumlu metrik toplama.

Parametreler:
- options: { prefix, labels }

Metrikler:
- requestCounter, requestDuration, errorCounter
- circuitBreakerState, queueSize, rateLimitHits
- activeConnections, memoryUsage

---

### createHealthCheck(options)
Sistem sağlık durumu raporu. Circuit breaker, queue, DB, Redis durumlarını toplar.

Parametreler:
- options: { checks: HealthCheck[] }

Dönüş: { status: 'healthy' | 'degraded' | 'unhealthy', checks: {...}, uptime }

---

### createAlerting(options)
Eşik aşımında alarm. Webhook, email, Slack, PagerDuty entegrasyonu.

Parametreler:
- options: { channels: AlertChannel[], rules: AlertRule[] }

Kanal Tipleri: slack, email, webhook, pagerduty, discord

---

### createTracing(options)
OpenTelemetry/Jaeger entegrasyonu. Distributed tracing.

Parametreler:
- options: { serviceName, exporter, samplingRate }

Metodlar:
- tracing.startSpan(name, context)
- tracing.injectContext(headers)
- tracing.extractContext(headers)

---

### logSanitization(data, options)
Log içindeki hassas verileri otomatik maskeleme. Password, token, IBAN, kredi kartı.

Parametreler:
- data: any
- options: { fields?: string[], patterns?: RegExp[], mask?: string }

Dönüş: Sanitized data

---

### sloMonitor(slo, metrics)
SLO/SLA hedeflerinin takibi. Error budget hesaplama.

Parametreler:
- slo: { target: number, window: '1d' | '7d' | '30d' }
- metrics: MetricData[]

Dönüş: { currentSLO: number, budgetRemaining: number, burnRate: number }

---

### errorBudgetTracker(slo)
Error budget kalanını takip eder. Tükenince alarm.

Parametreler:
- slo: { target: number, window: string }

Dönüş: { remaining: number, consumed: number, exhausted: boolean }

---

### realTimeDashboard
Canlı metrik paneli. WebSocket ile anlık veri akışı.

Metodlar:
- dashboard.subscribe(metrics: string[])
- dashboard.getSnapshot()
- dashboard.on('update', callback)

---

### requestTimeline(traceId)
Bir isteğin tüm yolculuğunu çıkarır. Tüm span'leri birleştirir.

Parametreler:
- traceId: string

Dönüş: { traceId, spans: TimelineSpan[], totalDuration: number, services: string[] }

---

### slowQueryDetector(options)
Ağır veritabanı sorgularını tespit eder.

Parametreler:
- options: { thresholdMs: number, sampleRate: number }

Metodlar:
- detector.analyze(query: string, durationMs: number)
- detector.getTopSlowQueries(limit: number)

---

### memoryLeakDetector(options)
Bellek kaçaklarını tespit eder. Heap snapshot karşılaştırma.

Parametreler:
- options: { intervalMs: number, thresholdMB: number, alertOnIncrease: boolean }

---

### immutableAuditTrail
Blockchain benzeri değiştirilemez log. Hash zinciri ile kurcalama tespiti.

Metodlar:
- trail.append(entry): Promise<void>
- trail.verify(): Promise<boolean> — Bütünlük kontrolü
- trail.query(filters): Promise<Entry[]>

---

### regulatoryReportGenerator(options)
Denetçi için otomatik rapor. PCI DSS, GDPR, ISO 27001 formatlarında.

Parametreler:
- options: { standard: 'pci' | 'gdpr' | 'iso27001' | 'soc2', period: DateRange }

---

### transactionReconstruction(txnId)
Bir işlemi baştan sona tüm adımlarıyla yeniden oluşturur.

Parametreler:
- txnId: string

Dönüş: { transactionId, steps: Step[], timeline: TimelineEntry[], actors: Actor[] }

---

### breachNotification(options)
Veri ihlali durumunda otomatik bildirim. DPO, müşteri, regülatör.

Parametreler:
- options: { severity: 'low' | 'medium' | 'high' | 'critical', affectedUsers: string[] }

---

## ⚙️ ENTERPRISE FEATURES (8 Modül)

### createGracefulShutdown(options)
SIGTERM alınınca yeni istek kabul etmez, mevcut işlemleri timeout süresince bekler, sonra kapanır.

Parametreler:
- options: { timeout: number, beforeShutdown?: () => Promise<void> }

---

### createFeatureToggle(store)
Admin panelinden veya Redis flag'i ile restart olmadan modül/endpoint kapatma (Kill Switch).

Parametreler:
- store: IStore

Metodlar:
- toggle.isEnabled(feature: string): Promise<boolean>
- toggle.enable(feature: string): Promise<void>
- toggle.disable(feature: string): Promise<void>

---

### createTenantIsolation(options)
Multi-tenant izolasyonu. Her tenant için ayrı rate limit, queue priority, DB havuz limiti.

Parametreler:
- options: { tenants: TenantConfig[], defaultLimits: ResourceLimits }

Metodlar:
- isolation.getTenantLimits(tenantId): ResourceLimits
- isolation.setTenantPriority(tenantId, priority): void

---

### createCQSRouter(options)
Read/Write split. GET → Read replica, POST/PUT/DELETE → Write master.

Parametreler:
- options: { readDB: PrismaClient, writeDB: PrismaClient, autoDetect?: boolean }

---

### createChaosEngineering(options)
Staging'de isteklerin %1'ine yapay gecikme/hata enjekte eder. Circuit breaker ve DLQ testi.

Parametreler:
- options: { latencyMs?: number, errorRate?: number, targetModules?: string[] }

---

### createPolicyEngine(opa)
Open Policy Agent entegrasyonu. Politika tabanlı erişim kontrolü.

Parametreler:
- opa: OPAClient
- policies: Policy[]

---

### createComplianceManager(options)
GDPR, KVKK, ISO 27001, SOC 2 süreçlerini yönetir.

Parametreler:
- options: { standards: ComplianceStandard[], autoAudit: boolean }

---

### licenseManager
Lisans yönetimi. Feature bazlı lisans kontrolü.

Metodlar:
- manager.validate(key: string): boolean
- manager.getLicensedFeatures(): string[]
- manager.expiresIn(): number

---

## 🚀 PERFORMANCE (8 Modül)

### createConnectionPool(options)
DB ve Redis bağlantı optimizasyonu. Min/max pool, idle timeout, connection validation.

Parametreler:
- options: { min: number, max: number, idleTimeoutMs: number, validateOnBorrow: boolean }

---

### requestCoalescing(key, fn, windowMs)
Aynı anda gelen aynı istekleri birleştirir. Sadece 1'i çalışır, hepsi aynı sonucu alır.

Parametreler:
- key: string, fn: () => Promise<T>, windowMs: number

---

### responseCompression(data, options)
Brotli/Gzip sıkıştırma. Content-Type'a göre otomatik seçim.

Parametreler:
- data: any
- options: { algorithm?: 'brotli' | 'gzip', level?: number, threshold?: number }

---

### smartCacheInvalidation(cache, options)
Cache temizleme stratejileri: write-through, write-behind, write-around, cache-aside.

Parametreler:
- cache: ICache
- options: { strategy: 'write-through' | 'write-behind' | 'write-around' | 'cache-aside' }

---

### multiLevelCache(options)
L1 (Memory) + L2 (Redis) + L3 (CDN) cache hiyerarşisi. Otomatik fallback.

Parametreler:
- options: { levels: CacheLevel[], defaultTTL: number }

---

### readWriteSplitting(options)
Replica database desteği. Read'ler replika'ya, write'lar master'a. Gecikme toleransı.

Parametreler:
- options: { master: DB, replicas: DB[], maxReplicaLagMs: number, strategy: 'random' | 'round-robin' | 'nearest' }

---

### loadShedding(options)
Sistem yük altındayken düşük öncelikli istekleri düşürür. Graceful degradation.

Parametreler:
- options: { cpuThreshold: number, memoryThreshold: number, shedPriorities: Priority[] }

---

### connectionPoolManager
DB ve Redis bağlantı havuzu yöneticisi. Health check, auto-reconnect, metrik toplama.

Metodlar:
- manager.getPool(name): Pool
- manager.healthCheck(): PoolHealth[]
- manager.resize(name, min, max): void

---

## 📦 EVENT DRIVEN (5 Modül)

### createEventStore(options)
Event Sourcing altyapısı. Tüm event'leri append-only log'da saklar.

Parametreler:
- options: { store: IStore, snapshotInterval: number }

---

### inboxPattern(options)
Exactly-once processing. Event işleme garantisi.

Parametreler:
- options: { db: PrismaClient, deduplicationWindow: number }

---

### eventReplay(eventStore, aggregateId, targetVersion)
Event geçmişini yeniden oynatma. Aggregate state yeniden oluşturma.

Parametreler:
- eventStore: EventStore
- aggregateId: string
- targetVersion: number

---

### versionedEvents
Event versiyonlama. Şema değişikliklerinde backward/forward compatibility.

Metodlar:
- versioner.upcast(event, fromVersion, toVersion)
- versioner.validate(event, schema)

---

### eventDeduplication(eventStore, eventId, windowMs)
Event bazlı tekrar engelleme.

Parametreler:
- eventStore: EventStore
- eventId: string
- windowMs: number

---

## 🌐 DISTRIBUTED SYSTEMS (5 Modül)

### createServiceDiscovery(options)
Dinamik servis keşfi. Consul, etcd veya DNS tabanlı.

Parametreler:
- options: { backend: 'consul' | 'etcd' | 'dns', endpoints: string[] }

---

### consistentHashing
Worker dağılımı için consistent hashing. Node ekleme/çıkarmada minimum yeniden dağıtım.

Metodlar:
- ring.addNode(node: string): void
- ring.removeNode(node: string): void
- ring.getNode(key: string): string

---

### distributedRateLimiting(identifier, options)
Redis tabanlı global rate limit. Tüm instance'lar arası paylaşımlı.

Parametreler:
- identifier: string
- options: { max: number, windowMs: number, redis: Redis }

---

### globalRequestId
Tüm servislerde ortak trace ID. X-Request-ID, X-Trace-ID, X-Span-ID.

Metodlar:
- id.generate(): { requestId, traceId, spanId }
- id.propagate(headers): void
- id.extract(headers): { requestId, traceId, spanId }

---

### clockSkewProtection
Sunucular arası zaman farkı yönetimi. NTP sync kontrolü, fark toleransı.

Parametreler:
- options: { maxSkewMs: number, ntpServers?: string[] }

---

## 🛠 RELIABILITY (5 Modül)

### createSelfHealingWorkers(options)
Kilitlenen worker'ları otomatik yeniden başlatır. Health check + heartbeat.

Parametreler:
- options: { heartbeatIntervalMs: number, maxHeartbeatMisses: number, restartPolicy: 'always' | 'on-failure' }

---

### autoRecoveryEngine(options)
Servis otomatik toparlanır. Hata pattern'lerini tanır, recovery action uygular.

Parametreler:
- options: { maxRecoveryAttempts: number, recoveryActions: RecoveryAction[] }

---

### hotConfigurationReload(store, watchers)
Restart olmadan config değişikliği. Redis pub/sub veya file watcher ile.

Parametreler:
- store: IStore
- watchers: { key: string, callback: (newValue: any) => void }[]

---

### safeMode(options)
Hata anında minimum modda çalışma. Kritik olmayan tüm özellikler kapalı.

Parametreler:
- options: { criticalFeatures: string[], fallbackBehavior: 'reject' | 'queue' | 'degrade' }

---

### brownoutMode(options)
Sistem yük altındayken kritik olmayan özellikleri kademeli kapatır.

Parametreler:
- options: { stages: BrownoutStage[], cpuThresholds: number[] }

---

## 🤖 SMART PROTECTION (5 Modül)

### adaptiveRateLimiting(identifier, fn, options)
Kullanıcı davranışına göre dinamik rate limit. Normal kullanıcıya esnek, şüpheliye katı.

Parametreler:
- identifier: string
- fn: () => Promise<T>
- options: { baseMax: number, minMax: number, learningRate: number }

---

### mlBasedAnomalyDetection
Makine öğrenmesi ile anomali tespiti. Isolation Forest veya Autoencoder tabanlı.

Parametreler:
- options: { model: 'isolation-forest' | 'autoencoder', trainingWindow: number }

---

### fraudDetectionHooks
Dolandırıcılık tespiti için altyapı. Kural tabanlı + ML skorlama.

Metodlar:
- fraud.evaluate(transaction): FraudScore
- fraud.addRule(rule: FraudRule): void
- fraud.on('alert', callback): void

---

### dynamicRiskScoring(req, transaction)
Her isteğe/işleme risk puanı verir. IP, device fingerprint, behavior, amount, frequency.

Parametreler:
- req: Request
- transaction: TransactionData

Dönüş: { score: number, level: 'low' | 'medium' | 'high' | 'critical', factors: RiskFactor[] }

---

### behavioralAnalysis(userId, action)
Kullanıcı davranış profili. Normal pattern dışı davranışları tespit eder.

Parametreler:
- userId: string
- action: { type: string, metadata: any }

Dönüş: { isAnomalous: boolean, confidence: number, profile: BehaviorProfile }

---

## ☁️ KUBERNETES / CLOUD NATIVE (6 Modül)

### podDisruptionHandler(options)
Güvenli pod sonlandırma. SIGTERM → drain → shutdown.

Parametreler:
- options: { drainTimeoutMs: number, preStopHook?: () => Promise<void> }

---

### horizontalAutoscalingHooks
HPA entegrasyonu. Queue uzunluğu, CPU, memory metriklerini K8s'e bildirir.

Parametreler:
- options: { targetCPUUtilization: number, targetMemoryUtilization: number, minReplicas: number, maxReplicas: number }

---

### verticalAutoscalingHooks
VPA desteği. Pod başına kaynak optimizasyonu.

Parametreler:
- options: { mode: 'Auto' | 'Recreate' | 'Initial' | 'Off' }

---

### nodeAffinitySupport
Pod yerleşim politikaları. Critical servisleri dedicated node'lara yerleştirir.

Parametreler:
- options: { requiredDuringScheduling?: NodeSelector, preferredDuringScheduling?: PreferredNode[] }

---

### multiRegionFailover(options)
Bölgesel yedeklilik. Active-passive veya active-active failover.

Parametreler:
- options: { regions: Region[], strategy: 'active-passive' | 'active-active', failoverTimeout: number }

---

### trafficMirroring(options)
Canlı trafiği kopyalayıp test ortamına yönlendirir. %100 veya örnekleme ile.

Parametreler:
- options: { target: string, samplingRate: number, mirrorHeaders: boolean }

---

## 🏛 ENTERPRISE (6 Modül)

### createPolicyEngine(opa)
Open Policy Agent (OPA) ile politika tabanlı erişim kontrolü. Rego dili ile kural yazımı.

Parametreler:
- opa: OPAClient
- options: { policyPath: string, autoReload: boolean }

---

### createComplianceManager(options)
GDPR, KVKK, ISO 27001, SOC 2, PCI DSS uyumluluk yöneticisi.

Parametreler:
- options: { standards: Standard[], autoRemediation: boolean }

---

### createTenantIsolation(options)
Çok kiracılı (Multi-tenant) sistemlerde tenant bazlı kaynak izolasyonu.

Parametreler:
- options: { isolationLevel: 'hard' | 'soft', defaultLimits: TenantLimits }

---

### createLicenseManager(options)
Feature bazlı lisans yönetimi. Lisans anahtarı doğrulama, expiry kontrolü.

Parametreler:
- options: { publicKey: string, features: Feature[] }

---

### createQuotaManager(options)
Tenant veya kullanıcı bazlı kota yönetimi. API call, storage, compute limitleri.

Parametreler:
- options: { defaultQuota: Quota, resetPeriod: 'daily' | 'weekly' | 'monthly' | 'yearly' }

---

### createUsageMetering(options)
Kaynak kullanım ölçümü ve faturalandırma altyapısı.

Parametreler:
- options: { metrics: MeterMetric[], aggregation: 'sum' | 'avg' | 'max' | 'count' }

---

## ⚡ DEVELOPER EXPERIENCE (5 Modül)

### createPluginSystem(aegis)
Modüler genişletme sistemi. Topluluk plugin'leri veya custom plugin yazımı.

Metodlar:
- pluginSystem.register(plugin: Plugin): void
- pluginSystem.load(name: string): Plugin
- pluginSystem.list(): Plugin[]

---

### createMiddlewarePipeline
Zincirleme middleware yapısı. before → execute → after → onError.

Metodlar:
- pipeline.use(middleware: Middleware): void
- pipeline.execute(context: Context): Promise<Result>

---

### createLifecycleHooks
beforeRequest, afterRequest, onError gibi yaşam döngüsü olayları.

Hook Tipleri:
- beforeRequest, afterSuccess, afterError, beforeRetry, afterCircuitOpen, afterRateLimit

---

### configurationValidator
Başlangıçta config doğrulama. Zod şeması ile. Eksik/yanlış config'de erken hata.

Parametreler:
- config: any
- schema: ZodSchema

Dönüş: { valid: boolean, errors: ValidationError[], config: ValidatedConfig }

---

### dynamicModuleLoader
Modülleri çalışma anında yükleme. Tree-shaking dostu. İsteğe bağlı bağımlılıklar.

Metodlar:
- loader.load(moduleName: string): Promise<Module>
- loader.isLoaded(moduleName: string): boolean
- loader.unload(moduleName: string): void

---

## 📋 TOPLAM MODÜL LİSTESİ (115 Modül)

| # | Kategori | Modül | Açıklama |
|---|----------|-------|----------|
| 1 | Core | withTimeout | İşleme maksimum süre koyma |
| 2 | Core | withRetry | Otomatik tekrar deneme + backoff |
| 3 | Core | withCircuitBreaker | Devre kesici |
| 4 | Core | withCascadingFailure | Bağımlılık çöküş engelleme |
| 5 | Core | withIdempotency | Tekrar eden işlem engelleme |
| 6 | Core | withRateLimit | İstek sayısı sınırlama |
| 7 | Core | withBulkhead | Kaynak havuzu izolasyonu |
| 8 | Core | withDeduplication | Eşzamanlı istek tekilleştirme |
| 9 | Core | withThrottling | Kademeli yavaşlatma |
| 10 | Core | withFallback | Hata durumunda yedek plan |
| 11 | Core | withShadowTraffic | Gölge trafik testi |
| 12 | Core | withPoisonPill | Zararlı payload koruması |
| 13 | Core | withCacheStampede | Thundering Herd engelleme |
| 14 | Core | withSchemaValidation | Payload şema doğrulama |
| 15 | Queue | PriorityQueue | Öncelikli kuyruk |
| 16 | Queue | DelayedQueue | Gecikmeli kuyruk |
| 17 | Queue | DeadLetterQueue | Başarısız işlem kuyruğu |
| 18 | Queue | ReplayEngine | DLQ geri besleme |
| 19 | Queue | BatchQueue | Toplu işlem kuyruğu |
| 20 | Queue | ScheduledQueue | Zamanlanmış kuyruk |
| 21 | Queue | StickyQueue | Aynı worker'a yönlendirme |
| 22 | Queue | WorkerScaling | Otomatik worker ölçekleme |
| 23 | Queue | OutboxPattern | Transaction'lu event yayını |
| 24 | Queue | DistributedLock | Dağıtık kilit (Redlock) |
| 25 | Queue | LeaderElection | Lider seçimi |
| 26 | Analysis | analyzeRequest | İstek analizi |
| 27 | Analysis | detectThreat | Tehdit tespiti |
| 28 | Analysis | blockRequest | IP engelleme |
| 29 | Analysis | unblockRequest | IP engel kaldırma |
| 30 | Analysis | requestFingerprinting | İstek parmak izi |
| 31 | Analysis | anomalyDetection | Anomali tespiti |
| 32 | Analysis | geoFencing | Coğrafi erişim kontrolü |
| 33 | Analysis | botDetection | Bot tespiti |
| 34 | Analysis | fieldLevelEncryption | Alan bazlı şifreleme |
| 35 | Analysis | wafEngine | WAF kural motoru |
| 36 | Analysis | apiSchemaEnforcement | API şema zorunluluğu |
| 37 | Analysis | dataLossPrevention | Veri sızıntı engelleme |
| 38 | Analysis | pciTokenization | PCI DSS tokenizasyon |
| 39 | Analysis | gdprRightToErasure | GDPR silme hakkı |
| 40 | Monitoring | createAuditLog | Denetim kaydı |
| 41 | Monitoring | createLogger | Structured logger |
| 42 | Monitoring | createMetrics | Prometheus metrikler |
| 43 | Monitoring | createHealthCheck | Sağlık kontrolü |
| 44 | Monitoring | createAlerting | Alarm sistemi |
| 45 | Monitoring | createTracing | Distributed tracing |
| 46 | Monitoring | logSanitization | Log maskeleme |
| 47 | Monitoring | sloMonitor | SLO takibi |
| 48 | Monitoring | errorBudgetTracker | Error budget yönetimi |
| 49 | Monitoring | realTimeDashboard | Canlı metrik paneli |
| 50 | Monitoring | requestTimeline | İstek zaman çizelgesi |
| 51 | Monitoring | slowQueryDetector | Ağır sorgu tespiti |
| 52 | Monitoring | memoryLeakDetector | Bellek kaçağı tespiti |
| 53 | Monitoring | immutableAuditTrail | Değiştirilemez denetim |
| 54 | Monitoring | regulatoryReportGenerator | Regülasyon raporu |
| 55 | Monitoring | transactionReconstruction | İşlem yeniden oluşturma |
| 56 | Monitoring | breachNotification | İhlal bildirimi |
| 57 | Features | createGracefulShutdown | Güvenli kapanma |
| 58 | Features | createFeatureToggle | Feature toggle / Kill switch |
| 59 | Features | createTenantIsolation | Multi-tenant izolasyon |
| 60 | Features | createCQSRouter | Read/Write split |
| 61 | Features | createChaosEngineering | Kaos mühendisliği |
| 62 | Features | createPolicyEngine | OPA politika motoru |
| 63 | Features | createComplianceManager | Uyumluluk yöneticisi |
| 64 | Features | licenseManager | Lisans yönetimi |
| 65 | Performance | createConnectionPool | Bağlantı havuzu |
| 66 | Performance | requestCoalescing | İstek birleştirme |
| 67 | Performance | responseCompression | Brotli/Gzip sıkıştırma |
| 68 | Performance | smartCacheInvalidation | Akıllı cache temizleme |
| 69 | Performance | multiLevelCache | Çok seviyeli cache |
| 70 | Performance | readWriteSplitting | Okuma/yazma ayırma |
| 71 | Performance | loadShedding | Yük atma |
| 72 | Performance | connectionPoolManager | Havuz yöneticisi |
| 73 | Event | createEventStore | Event Store |
| 74 | Event | inboxPattern | Exactly-once processing |
| 75 | Event | eventReplay | Event yeniden oynatma |
| 76 | Event | versionedEvents | Event versiyonlama |
| 77 | Event | eventDeduplication | Event tekrar engelleme |
| 78 | Distributed | createServiceDiscovery | Servis keşfi |
| 79 | Distributed | consistentHashing | Consistent hashing |
| 80 | Distributed | distributedRateLimiting | Dağıtık rate limit |
| 81 | Distributed | globalRequestId | Global request ID |
| 82 | Distributed | clockSkewProtection | Zaman farkı koruması |
| 83 | Reliability | createSelfHealingWorkers | Kendi kendini iyileştiren worker |
| 84 | Reliability | autoRecoveryEngine | Otomatik toparlanma |
| 85 | Reliability | hotConfigurationReload | Sıcak config yenileme |
| 86 | Reliability | safeMode | Güvenli mod |
| 87 | Reliability | brownoutMode | Kademeli kapanma |
| 88 | Smart | adaptiveRateLimiting | Adaptif rate limiting |
| 89 | Smart | mlBasedAnomalyDetection | ML tabanlı anomali |
| 90 | Smart | fraudDetectionHooks | Dolandırıcılık tespiti |
| 91 | Smart | dynamicRiskScoring | Dinamik risk puanı |
| 92 | Smart | behavioralAnalysis | Davranış analizi |
| 93 | K8s | podDisruptionHandler | Pod sonlandırma |
| 94 | K8s | horizontalAutoscalingHooks | HPA entegrasyonu |
| 95 | K8s | verticalAutoscalingHooks | VPA desteği |
| 96 | K8s | nodeAffinitySupport | Pod yerleşim politikası |
| 97 | K8s | multiRegionFailover | Bölgesel yedeklilik |
| 98 | K8s | trafficMirroring | Trafik kopyalama |
| 99 | Enterprise | createPolicyEngine | OPA entegrasyonu |
| 100 | Enterprise | createComplianceManager | Uyumluluk yönetimi |
| 101 | Enterprise | createTenantIsolation | Tenant izolasyonu |
| 102 | Enterprise | createLicenseManager | Lisans yönetimi |
| 103 | Enterprise | createQuotaManager | Kota yönetimi |
| 104 | Enterprise | createUsageMetering | Kullanım ölçümü |
| 105 | DX | createPluginSystem | Plugin sistemi |
| 106 | DX | createMiddlewarePipeline | Middleware zinciri |
| 107 | DX | createLifecycleHooks | Yaşam döngüsü hook'ları |
| 108 | DX | configurationValidator | Config doğrulama |
| 109 | DX | dynamicModuleLoader | Dinamik modül yükleme |
| 110 | Security | mTLSBetweenServices | Servisler arası mTLS |
| 111 | Security | secretsRotation | Otomatik anahtar döndürme |
| 112 | Security | runtimeSecretInjection | Runtime secret enjeksiyonu |
| 113 | Security | dualAuthorization | 4-eyes prensibi |
| 114 | Security | transactionSigning | İşlem imzalama |
| 115 | Security | stepUpAuthentication | Adımlı kimlik doğrulama |

---

## 📄 LICENSE

MIT License — Copyright (c) 2025 Aegis Contributors

---

> "Zeus'un kalkanı artık senin ellerinde." 🛡️





