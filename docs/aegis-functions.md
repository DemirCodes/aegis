# 🛡️ AEGIS - Complete Project Specification

---

# 📌 PROJECT SCOPE: Bu Projede Neler Yapacağız?

## Genel Amaç
Production-ready microservices framework geliştirmek. Node.js + TypeScript stack'inin üzerine 13 modular library ekleyerek, her projede tekrar yazılan kodu ortadan kaldırmak.

## Bize Ne Kazandıracak?

### ✅ Yazacağımız Şeyler (Deliverables)

**13 Bağımsız NPM Package:**
1. `@aegis/audit` - Audit trail + GDPR compliance
2. `@aegis/observability` - Distributed tracing + business metrics
3. `@aegis/resilience` - Circuit breaker + retry logic
4. `@aegis/cache` - Smart caching + invalidation
5. `@aegis/validation` - Zod + gRPC validation bridge
6. `@aegis/queue` - BullMQ wrapper + DLQ handling
7. `@aegis/security` - Rate limiting + JWT + risk scoring
8. `@aegis/starter-template` - Project scaffold + Docker setup
9. `@aegis/cli` - Command-line tools
10. `@aegis/docs` - Documentation generator
11. `@aegis/testing` - Test utilities + fixtures
12. `@aegis/performance` - Profilers + load testing
13. `@aegis/migration` - Database migration system

**+ Bonus:**
- `@aegis/core` - Shared utilities
- **Demo App** - Tüm library'leri showcase eden örnek uygulama
- **Comprehensive Docs** - Setup guides, best practices, API reference

### ⏳ Tahmini Süre
**9-12 ay** (full-time development)

### 🎯 Target Audience
- Mid-to-Senior engineers
- Startup'lar (fast execution)
- Enterprise teams (scalability + compliance)

### 💰 Business Value
- **Development speed:** 30-40% faster
- **Code reuse:** 60% less boilerplate
- **Production readiness:** Day 1
- **Operational excellence:** Built-in observability

---

# 📚 DETAILED FUNCTION SPECIFICATIONS

Aşağıdaki format kullanılmıştır:

```
## ✅ Function Name
**Açıklama:** Ne yapıyor?
**Parametre:**
- paramName: Type → Açıklama
**Dönüş:**
- Type → Açıklama
**Kullanım Senaryosu:** Hangi durumda kullanılır?
```

---

# 🎯 TIER 1: FOUNDATION LIBRARIES

---

## 1️⃣ **aegis-audit** - Audit Trail & GDPR Compliance

### 📌 Decorator

#### ✅ @Audited()
**Açıklama:** Bir metodun tüm çağrılarını otomatik olarak audit trail'a kaydeder. Veri değişikliklerini (CREATE, UPDATE, DELETE) takip eder. Who, What, When, Why bilgilerini loglar.

**Parametreler:**
```typescript
options?: {
  include?: string[]          // Hangi field'ları log'la (whitelist)
  exclude?: string[]          // Hangi field'ları log'lama (blacklist)
  trackDeletes?: boolean      // Delete işlemlerini track et (default: true)
  sensitive?: boolean         // Sensitive data handling (default: false)
  customFields?: Record<string, any>  // Ekstra metadata ekle
}
```

**Dönüş:** void (Decorator, return type yok)

**Kullanım Senaryosu:**
```typescript
class UserService {
  @Audited({ exclude: ['password'] })
  async updateUser(id: string, data: UpdateUserDto) {
    // Password field'ı log'lanmayacak
    // Diğer tüm değişiklikler otomatik audit'e kaydedilecek
  }
}
```

---

### 📌 Services

#### ✅ createAuditLog()
**Açıklama:** Yeni bir audit log entry'si oluştur ve veritabanına kaydet.

**Parametre:**
- userId: string → Hangi kullanıcı yaptı?
- entity: string → Hangi entity'ye yapıldı? (User, Product, Order, etc.)
- action: 'CREATE' | 'UPDATE' | 'DELETE' → Hangi işlem?
- changes: Record<string, any> → Ne değişti? (field: { old, new })
- metadata?: AuditMetadata → IP, User Agent, correlationId, vb.

**Dönüş:**
- Promise<AuditLog> → Oluşturulan audit log object'i

**Kullanım Senaryosu:**
Bir user'ın email'i değiştirildiğinde:
```typescript
await auditTrailService.createAuditLog(
  'user-123',
  'User',
  'UPDATE',
  { email: { old: 'old@email.com', new: 'new@email.com' } },
  { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0...' }
)
```

---

#### ✅ getAuditLogs()
**Açıklama:** Audit log'ları sor. Filtrele, sırala, page'le.

**Parametre:**
- filters: AuditFilters → Filtreleme kriterleri
  - userId?: string
  - entityType?: string
  - action?: 'CREATE' | 'UPDATE' | 'DELETE'
  - startDate?: Date
  - endDate?: Date
  - entityId?: string
- pagination?: PaginationOptions → Sayfalama
  - page?: number (default: 1)
  - pageSize?: number (default: 20)
  - sort?: string[] (['createdAt:desc'])

**Dönüş:**
- Promise<PaginatedAuditLogs> → 
  - data: AuditLog[]
  - total: number
  - page: number
  - pageSize: number
  - hasMore: boolean

**Kullanım Senaryosu:**
Admin panelinde user-123'ün son 1 aydaki aktivitelerini göster:
```typescript
const logs = await auditTrailService.getAuditLogs(
  {
    userId: 'user-123',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  },
  { page: 1, pageSize: 50, sort: ['createdAt:desc'] }
)
```

---

#### ✅ getAuditLogById()
**Açıklama:** Spesifik bir audit log entry'sini ID'siyle sor.

**Parametre:**
- auditLogId: string → Audit log'un unique ID'si

**Dönüş:**
- Promise<AuditLog | null> → Bulundu ise AuditLog, bulunamadı ise null

**Kullanım Senaryosu:**
Belirli bir değişikliği detaylı incelemek için:
```typescript
const log = await auditTrailService.getAuditLogById('audit-log-xyz')
// { userId: 'user-123', entity: 'User', action: 'UPDATE', changes: {...}, ... }
```

---

#### ✅ exportAuditTrail()
**Açıklama:** Audit trail'ı PDF, CSV, veya JSON formatında export et. Compliance reports için.

**Parametre:**
- filters: AuditFilters → Hangi log'ları export etmek istiyorsun?
- format: 'pdf' | 'csv' | 'json' → Export formatı

**Dönüş:**
- Promise<Buffer> → File content (binary data)

**Kullanım Senaryosu:**
GDPR audit raporu oluştur ve gönder:
```typescript
const buffer = await auditTrailService.exportAuditTrail(
  { userId: 'user-123', startDate: new Date('2024-01-01') },
  'pdf'
)
// Email'e PDF olarak gönder
```

---

#### ✅ getUserActivityHistory()
**Açıklama:** Belirli bir user'ın tüm aktivitelerinin timeline'ını getir. Kronolojik sırada.

**Parametre:**
- userId: string → Hangi kullanıcı?
- options?: ActivityHistoryOptions →
  - limit?: number (default: 100)
  - includeFailures?: boolean (default: true)
  - entityFilters?: string[] (sadece belirli entity'ler)

**Dönüş:**
- Promise<UserActivityLog[]> → 
  - { timestamp, action, entity, entityId, changes }

**Kullanım Senaryosu:**
User profile sayfasında "Recent Activity" widget'ı:
```typescript
const history = await auditTrailService.getUserActivityHistory('user-123', { limit: 10 })
// [ { timestamp: '2024-01-15T10:30:00Z', action: 'UPDATE', entity: 'Profile', ... } ]
```

---

#### ✅ getEntityHistory()
**Açıklama:** Belirli bir entity'nin (örn. Product-456) tüm değişiklik geçmişini getir.

**Parametre:**
- entityType: string → Entity tipi (User, Product, Order, etc.)
- entityId: string → Entity'nin unique ID'si

**Dönüş:**
- Promise<AuditLog[]> → O entity'ye ait tüm audit log'lar

**Kullanım Senaryosu:**
Bir ürünün fiyatının ne zaman, kaç kez değiştirildiğini görmek:
```typescript
const history = await auditTrailService.getEntityHistory('Product', 'prod-123')
// [ { action: 'CREATE', ... }, { action: 'UPDATE', changes: { price: { old: 100, new: 150 } } }, ... ]
```

---

#### ✅ searchAuditLogs()
**Açıklama:** Full-text search yaparak audit log'ları ara. Elasticsearch/database'de arat.

**Parametre:**
- query: string → Arama terimi (user email, ürün adı, etc.)
- filters?: AuditFilters → Ek filtreler (tarih range, entity type, etc.)

**Dönüş:**
- Promise<AuditLog[]> → Matching log'lar

**Kullanım Senaryosu:**
Admin araması: "user@email.com ile ilgili tüm audit log'ları bul":
```typescript
const results = await auditTrailService.searchAuditLogs('user@email.com')
```

---

### 📌 GDPR Service

#### ✅ eraseUserData()
**Açıklama:** User'ı GDPR-compliant şekilde sil. Tüm kişisel veriyi cascade olarak sil, audit log'a kaydet.

**Parametre:**
- userId: string → Hangi user silinecek?
- reason: string → Silme nedeni (user requested, account close, etc.)

**Dönüş:**
- Promise<GDPRErasureResult> → 
  - userId: string
  - status: 'completed' | 'pending' | 'failed'
  - erasedAt: Date
  - tablesAffected: string[] (User, UserProfile, Orders, etc.)
  - recordsDeleted: number (toplam silinen record sayısı)
  - errors?: string[] (hata varsa)

**Kullanım Senaryosu:**
User silme requestine cevap ver (GDPR compliance):
```typescript
const result = await gdprService.eraseUserData('user-123', 'user_requested')
// Status: 'completed', tablesAffected: ['users', 'user_profiles', 'orders', ...], recordsDeleted: 1250
```

---

#### ✅ exportUserData()
**Açıklama:** User'ın tüm verilerini export et (GDPR "right to data"). JSON/CSV formatında.

**Parametre:**
- userId: string → Hangi user'ın verisi?
- format?: 'json' | 'csv' (default: 'json')

**Dönüş:**
- Promise<UserDataExport> →
  - userId: string
  - exportedAt: Date
  - data: { profile, activities, auditLogs, metadata }
  - format: 'json' | 'csv'

**Kullanım Senaryosu:**
User veri talebinde (GDPR right-to-data):
```typescript
const export = await gdprService.exportUserData('user-123', 'json')
// { userId, exportedAt, data: { profile: {...}, activities: [...], auditLogs: [...] } }
// User'a email olarak gönder
```

---

#### ✅ anonymizeUserData()
**Açıklama:** User verilerini anonymize et (tamamen silme yerine). PII'ı kaldır ama işlem geçmişini tut.

**Parametre:**
- userId: string → Hangi user anonymize edilecek?
- fields: string[] → Hangi field'ları anonymize et? (email, phone, name, etc.)

**Dönüş:**
- Promise<AnonymizationResult> →
  - userId: string
  - anonymizedAt: Date
  - fieldsAnonymized: string[]
  - status: 'completed' | 'partial' | 'failed'

**Kullanım Senaryosu:**
Eski user hesaplarını anonymize et (veri koruma):
```typescript
const result = await gdprService.anonymizeUserData('user-123', ['email', 'phone', 'fullName'])
// email: 'user_[hash]@anonymous.local', phone: '[anonymized]', fullName: '[anonymized]'
```

---

#### ✅ getCascadeDeletePlan()
**Açıklama:** User silindiğinde hangi table'lara cascade delete yapılacağını önceden göster. Simülasyon.

**Parametre:**
- userId: string → Hangi user?

**Dönüş:**
- Promise<CascadeDeletePlan> →
  - userId: string
  - tables: Array<{ table: string, recordCount: number, cascadeDepth: number }>
  - totalRecordsToDelete: number
  - estimatedDuration: number (seconds)

**Kullanım Senaryosu:**
Silme öncesi impact analizi:
```typescript
const plan = await gdprService.getCascadeDeletePlan('user-123')
// tables: [
//   { table: 'users', recordCount: 1 },
//   { table: 'user_profiles', recordCount: 1 },
//   { table: 'orders', recordCount: 45 },
//   { table: 'order_items', recordCount: 120 },
//   ...
// ],
// totalRecordsToDelete: 2500
```

---

#### ✅ verifyErasureCompletion()
**Açıklama:** Silme işlemi tamamlandı mı? Verifiye et. Orphaned records kaldı mı?

**Parametre:**
- userId: string → Hangi user'ın silinişi kontrol edilecek?

**Dönüş:**
- Promise<ErasureVerification> →
  - userId: string
  - isComplete: boolean
  - orphanedRecords: Array<{ table: string, count: number }>
  - verifiedAt: Date
  - status: 'clean' | 'has_orphans' | 'incomplete'

**Kullanım Senaryosu:**
Compliance audit: user silinişinin tamamlanmış olup olmadığını kontrol et:
```typescript
const verify = await gdprService.verifyErasureCompletion('user-123')
// isComplete: true, status: 'clean', orphanedRecords: []
```

---

#### ✅ scheduleDataErasure()
**Açıklama:** Veri silinişini belirli bir zamana planla (request'ten sonra 30 gün gibi).

**Parametre:**
- userId: string → Silinecek user
- scheduledAt: Date → Ne zaman silinsin?
- reason: string → Silme nedeni

**Dönüş:**
- Promise<ScheduledErasure> →
  - userId: string
  - scheduledAt: Date
  - status: 'scheduled' | 'executed' | 'cancelled'
  - createdAt: Date
  - canBeCancelled: boolean

**Kullanım Senaryosu:**
User silme talebini 30 gün sonraya planla (right to withdraw):
```typescript
const scheduled = await gdprService.scheduleDataErasure(
  'user-123',
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  'user_requested_with_30day_delay'
)
// User 30 gün içinde cancel edebilir
```

---

### 📌 Types

```typescript
type AuditLog = {
  id: string                        // Unique audit log ID
  userId: string                    // Kimin yaptığı
  entityType: string                // Hangi entity'ye (User, Product, Order)
  entityId: string                  // Entity'nin ID'si
  action: 'CREATE' | 'UPDATE' | 'DELETE'  // Hangi işlem
  changes: Record<string, {        // Değişiklikler
    old: any                         // Eski değer
    new: any                         // Yeni değer
  }>
  metadata?: {
    ipAddress?: string              // Hangi IP'den
    userAgent?: string              // Hangi browser'dan
    correlationId?: string          // Request'in trace ID'si
    customFields?: Record<string, any>
  }
  timestamp: Date                   // Ne zaman
  status: 'completed' | 'failed'    // Başarılı mı?
}

type AuditFilters = {
  userId?: string
  entityType?: string
  action?: 'CREATE' | 'UPDATE' | 'DELETE'
  startDate?: Date
  endDate?: Date
  entityId?: string
}

type PaginatedAuditLogs = {
  data: AuditLog[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

type UserActivityLog = {
  timestamp: Date
  action: string
  entity: string
  entityId: string
  changes: Record<string, any>
  ipAddress?: string
}

type GDPRErasureResult = {
  userId: string
  status: 'completed' | 'pending' | 'failed'
  erasedAt: Date
  tablesAffected: string[]
  recordsDeleted: number
  errors?: string[]
}

type UserDataExport = {
  userId: string
  exportedAt: Date
  data: {
    profile: any
    activities: any[]
    auditLogs: AuditLog[]
    metadata: Record<string, any>
  }
  format: 'json' | 'csv'
}

type AnonymizationResult = {
  userId: string
  anonymizedAt: Date
  fieldsAnonymized: string[]
  status: 'completed' | 'partial' | 'failed'
}

type CascadeDeletePlan = {
  userId: string
  tables: Array<{
    table: string
    recordCount: number
    cascadeDepth: number
  }>
  totalRecordsToDelete: number
  estimatedDuration: number  // seconds
}

type ErasureVerification = {
  userId: string
  isComplete: boolean
  orphanedRecords: Array<{ table: string; count: number }>
  verifiedAt: Date
  status: 'clean' | 'has_orphans' | 'incomplete'
}

type ScheduledErasure = {
  userId: string
  scheduledAt: Date
  status: 'scheduled' | 'executed' | 'cancelled'
  createdAt: Date
  canBeCancelled: boolean
}
```

---

## 2️⃣ **aegis-observability** - Distributed Tracing & Business Metrics

### 📌 Middleware

#### ✅ traceCorrelationMiddleware()
**Açıklama:** Request'den trace-id extract et, tüm log'lara ve downstream call'lara inject et.

**Parametre:** Yok

**Dönüş:** Express/Fastify middleware function

**Kullanım Senaryosu:**
```typescript
app.use(traceCorrelationMiddleware())
// Artık her request'in trace-id'si otomatik olarak:
// - Log'lara eklenir
// - gRPC call'larına header'da gönderilir
// - Response header'ına yazılır
```

---

### 📌 Business Metrics Helper

#### ✅ paymentProcessing()
**Açıklama:** Ödeme işlemlerinin metrik'lerini track etmek için helper. Latency, success rate, error types.

**Parametre:** Yok

**Dönüş:** PaymentMetrics object

**Kullanım Senaryosu:**
```typescript
const metric = businessMetrics.paymentProcessing()
metric.recordLatency(1500)  // 1.5 saniye
metric.recordSuccess()
metric.recordError('insufficient_funds')
// Prometheus'a otomatik gönderilir
```

---

#### ✅ apiEndpoint()
**Açıklama:** Spesifik bir API endpoint'inin metrik'lerini track et.

**Parametre:**
- endpoint: string (örn: '/api/users')
- method: string ('GET', 'POST', 'PUT', 'DELETE')

**Dönüş:** EndpointMetrics object

**Kullanım Senaryosu:**
```typescript
const metric = businessMetrics.apiEndpoint('/api/users', 'POST')
metric.recordLatency(250)
metric.recordSuccess()
// /api/users POST'un latency'sini track eder
```

---

#### ✅ databaseOperation()
**Açıklama:** Database query'lerinin latency'sini, row count'ını track et.

**Parametre:**
- operation: string ('SELECT', 'INSERT', 'UPDATE', 'DELETE')

**Dönüş:** DatabaseMetrics object

---

#### ✅ thirdPartyCall()
**Açıklama:** External API call'larının (Stripe, AWS, etc.) success/failure'ını track et.

**Parametre:**
- serviceName: string ('Stripe', 'AWS', 'SendGrid', etc.)

**Dönüş:** ThirdPartyMetrics object

---

#### ✅ userAction()
**Açıklama:** User action'larını track et (login, signup, purchase, etc.)

**Parametre:**
- actionType: string ('login', 'signup', 'purchase', 'logout')

**Dönüş:** UserMetrics object

---

### 📌 Anomaly Detector

#### ✅ detectZScoreAnomaly()
**Açıklama:** Z-score algoritmasını kullanarak veri noktalarında anomali tespit et.

**Parametre:**
- dataPoints: number[] → Geçmiş veri noktaları (latency, error count, etc.)
- threshold?: number (default: 3) → Kaç sigma dışında kalırsa anomali?

**Dönüş:**
- AnomalyDetectionResult →
  - isAnomaly: boolean
  - score: number (z-score)
  - threshold: number
  - severity: 'low' | 'medium' | 'high' | 'critical'
  - timestamp: Date

**Kullanım Senaryosu:**
Son 100 request'in latency'lerinde anomali var mı?
```typescript
const latencies = [150, 160, 155, 2000, 165, ...] // 4. eleman anomali
const result = await anomalyDetector.detectZScoreAnomaly(latencies, 3)
// isAnomaly: true, severity: 'critical'
```

---

#### ✅ detectIQRAnomaly()
**Açıklama:** Interquartile Range (IQR) algoritması kullanarak anomali tespit et. Z-score'dan daha robust.

**Parametre:**
- dataPoints: number[]
- multiplier?: number (default: 1.5) → IQR * multiplier dışında kalırsa anomali

**Dönüş:** AnomalyDetectionResult

---

#### ✅ detectSpikeInMetric()
**Açıklama:** Belirli bir Prometheus metrik'inde spike (ani yükselişi) tespit et.

**Parametre:**
- metricName: string → Prometheus metrik adı (request_latency, error_rate, etc.)
- window: 'hour' | 'day' | 'week' → Hangi zaman penceresi?

**Dönüş:**
- Promise<SpikeDetectionResult> →
  - hasSpike: boolean
  - baselineValue: number
  - peakValue: number
  - increasePercentage: number
  - detectedAt: Date

**Kullanım Senaryosu:**
Son 1 saatte error rate'de spike var mı?
```typescript
const spike = await anomalyDetector.detectSpikeInMetric('error_rate', 'hour')
// hasSpike: true, baselineValue: 0.5%, peakValue: 5%, increasePercentage: 900%
```

---

#### ✅ setAnomalyAlert()
**Açıklama:** Anomali tespit edildiğinde otomatik alert'i kur (email, Slack, etc.)

**Parametre:**
- metricName: string
- threshold: number
- action: AlertAction → { type: 'email' | 'slack' | 'webhook', config: {...} }

**Dönüş:** Promise<void>

---

#### ✅ getAnomalyHistory()
**Açıklama:** Belirli bir metrik'in geçmiş anomali'lerini getir.

**Parametre:**
- metricName: string
- limit?: number (default: 100)

**Dönüş:** Promise<AnomalyEvent[]>

---

### 📌 Observability Service

#### ✅ getTraceDetails()
**Açıklama:** Belirli bir trace'in tüm span'larını, service call'larını getir.

**Parametre:**
- traceId: string

**Dönüş:**
- Promise<TraceDetails> →
  - traceId: string
  - spans: Span[] (her service call'ın detayı)
  - duration: number (total ms)
  - status: 'success' | 'error'
  - serviceCalls: ServiceCall[]

**Kullanım Senaryosu:**
Yavaş bir request'in trace'ini incelemek:
```typescript
const trace = await observability.getTraceDetails('trace-xyz')
// Tüm service call'lar, latency'leri, hangi servis yavaş?
```

---

#### ✅ correlateTraceWithLogs()
**Açıklama:** Trace'in span'larını, ilgili log'larla eşleştir (correlation).

**Parametre:**
- traceId: string

**Dönüş:**
- Promise<CorrelatedData> →
  - traceId: string
  - spans: Span[] (OpenTelemetry spans)
  - logs: LogEntry[] (Winston logs aynı traceId'li)
  - correlatedEvents: Array<{ span, logs }>

**Kullanım Senaryosu:**
Hata debug'lamak:
```typescript
const correlated = await observability.correlateTraceWithLogs('trace-error-123')
// Trace'i ve onunla ilgili tüm log'ları bir yerde görebilirsin
```

---

#### ✅ generatePerformanceReport()
**Açıklama:** Belirli bir zaman aralığında sistem performans report'u oluştur.

**Parametre:**
- filters: PerformanceFilters →
  - startDate: Date
  - endDate: Date
  - endpoint?: string (spesifik endpoint için)
  - serviceNames?: string[]

**Dönüş:**
- Promise<PerformanceReport> →
  - period: { start, end }
  - avgLatency: number
  - p95Latency: number
  - p99Latency: number
  - errorRate: number
  - throughput: number (req/sec)
  - topSlowEndpoints: EndpointMetric[]
  - topErrorEndpoints: EndpointMetric[]

**Kullanım Senaryosu:**
Günlük performance report hazırla:
```typescript
const report = await observability.generatePerformanceReport({
  startDate: yesterday,
  endDate: today
})
// email'e gönder veya dashboard'a göster
```

---

#### ✅ getServiceHealthStatus()
**Açıklama:** Belirli bir service'in (veya tümünün) health status'unu getir.

**Parametre:**
- serviceName?: string (optional, belirtilmezse tüm servisler)

**Dönüş:**
- Promise<HealthStatus | HealthStatus[]> →
  - serviceName: string
  - status: 'healthy' | 'degraded' | 'unhealthy'
  - uptime: number (%)
  - errorRate: number (%)
  - lastCheck: Date

**Kullanım Senaryosu:**
Dashboard'da tüm servisler sağlıklı mı kontrol et:
```typescript
const statuses = await observability.getServiceHealthStatus()
// [ { serviceName: 'auth', status: 'healthy', errorRate: 0.1% }, ... ]
```

---

#### ✅ getErrorRateByEndpoint()
**Açıklama:** Her endpoint'in error rate'ini getir.

**Parametre:**
- options?: ErrorRateOptions →
  - timeWindow?: 'hour' | 'day' | 'week'
  - threshold?: number (sadece bu kadar yüksek olanları getir)

**Dönüş:**
- Promise<ErrorRateMetrics[]> →
  - endpoint: string
  - method: string
  - errorRate: number (%)
  - errorCount: number
  - totalRequests: number

---

#### ✅ getLatencyPercentiles()
**Açıklama:** Bir endpoint'in latency percentile'larını getir (p50, p95, p99).

**Parametre:**
- endpoint: string

**Dönüş:**
- Promise<LatencyPercentiles> →
  - endpoint: string
  - p50: number (median)
  - p75: number
  - p95: number
  - p99: number
  - max: number

**Kullanım Senaryosu:**
SLA monitoring:
```typescript
const latencies = await observability.getLatencyPercentiles('/api/users')
// p99 < 500ms olmalı, eğer değilse alert
```

---

#### ✅ customMetricQuery()
**Açıklama:** Prometheus'a custom PromQL query'si gönder, sonuç getir.

**Parametre:**
- query: PrometheusQuery →
  - expression: string (PromQL)
  - start: Date
  - end: Date
  - step?: string ('60s')

**Dönüş:**
- Promise<MetricResult> →
  - metric: Record<string, string>
  - value: number[]
  - timestamps: Date[]

---

### 📌 Types

```typescript
type TraceDetails = {
  traceId: string
  spans: Span[]                    // Her service call
  duration: number                 // Total ms
  status: 'success' | 'error'
  serviceCalls: ServiceCall[]      // Hangi service'lere çağrı yapıldı
  timestamp: Date
}

type Span = {
  spanId: string
  traceId: string
  operationName: string           // 'PaymentService.process'
  duration: number                // ms
  status: 'ok' | 'error'
  tags: Record<string, any>
  logs: SpanLog[]
  startTime: Date
  endTime: Date
}

type AnomalyDetectionResult = {
  isAnomaly: boolean
  score: number                   // Z-score veya IQR score
  threshold: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: Date
}

type SpikeDetectionResult = {
  hasSpike: boolean
  baselineValue: number
  peakValue: number
  increasePercentage: number
  detectedAt: Date
}

type PerformanceReport = {
  period: { start: Date; end: Date }
  avgLatency: number              // ms
  p95Latency: number
  p99Latency: number
  errorRate: number               // %
  throughput: number              // req/sec
  topSlowEndpoints: EndpointMetric[]
  topErrorEndpoints: EndpointMetric[]
}

type HealthStatus = {
  serviceName: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number                  // %
  errorRate: number               // %
  lastCheck: Date
}

type EndpointMetric = {
  endpoint: string
  method: string
  avgLatency?: number
  errorRate?: number
  throughput?: number
}

type LatencyPercentiles = {
  endpoint: string
  p50: number                     // Median
  p75: number
  p95: number
  p99: number
  max: number
}

type ErrorRateMetrics = {
  endpoint: string
  method: string
  errorRate: number               // %
  errorCount: number
  totalRequests: number
}

type CorrelatedData = {
  traceId: string
  spans: Span[]
  logs: LogEntry[]
  correlatedEvents: Array<{
    span: Span
    logs: LogEntry[]
  }>
}
```

---

## 3️⃣ **aegis-resilience** - Circuit Breaker & Retry Logic

### 📌 Decorators

#### ✅ @GrpcCall()
**Açıklama:** gRPC call'ını wrap et. Otomatik retry, circuit breaker, timeout ile.

**Parametre:**
```typescript
options: {
  service: string                  // 'PaymentService'
  method: string                   // 'processPayment'
  retries?: number                 // Default: 3
  timeout?: number                 // ms, Default: 5000
  circuitBreaker?: boolean         // Default: true
  backoff?: 'exponential' | 'linear'
  fallback?: () => any
}
```

**Dönüş:** Decorator (method wrapper)

**Kullanım Senaryosu:**
```typescript
class OrderService {
  @GrpcCall({
    service: 'PaymentService',
    method: 'processPayment',
    retries: 3,
    timeout: 5000,
    circuitBreaker: true
  })
  async createOrder(orderId: string) {
    // gRPC call otomatik retry + circuit breaker ile yapılır
  }
}
```

---

#### ✅ @CircuitBreaker()
**Açıklama:** Bir service'in çökmesi durumunda istekleri bloklayan circuit breaker.

**Parametre:**
```typescript
options: {
  failureThreshold?: number        // Default: 5 failures
  resetTimeout?: number            // Default: 60000ms (1 dakika)
  halfOpenRequests?: number        // Default: 1
}
```

**Dönüş:** Decorator

---

### 📌 CircuitBreakerService

#### ✅ executeWithCircuitBreaker()
**Açıklama:** Verilen fonksiyonu circuit breaker ile wrap'le ve çalıştır.

**Parametre:**
- key: string → Circuit breaker'ın unique key'i ('payment-service', 'email-service', etc.)
- fn: () => Promise<T> → Çalıştırılacak async function
- options?: CBOptions → failureThreshold, resetTimeout, etc.

**Dönüş:**
- Promise<T> → Function'ın sonucu (başarılıysa), veya error throw

**Kullanım Senaryosu:**
```typescript
const result = await circuitBreakerService.executeWithCircuitBreaker(
  'payment-api',
  () => paymentProvider.charge({ amount: 100 }),
  { failureThreshold: 5, resetTimeout: 60000 }
)
// 5 hata sonra circuit "OPEN" olur, 1 dakika boyunca call'lar reject edilir
```

---

#### ✅ getCircuitStatus()
**Açıklama:** Circuit breaker'ın current state'ini getir.

**Parametre:**
- key: string

**Dönüş:**
- CircuitBreakerStatus →
  - state: 'closed' | 'open' | 'half-open'
  - failureCount: number
  - successCount: number
  - lastFailureTime?: Date
  - nextRetryTime?: Date

**Kullanım Senaryosu:**
Dashboard'da circuit breaker statüsü göster:
```typescript
const status = await circuitBreakerService.getCircuitStatus('payment-api')
// state: 'open', failureCount: 7, nextRetryTime: '2024-01-15T10:35:00Z'
```

---

#### ✅ getMetrics()
**Açıklama:** Tüm circuit breaker'ların (veya spesifik bir'in) metric'lerini getir.

**Parametre:**
- key?: string (optional, tüm circuit breaker'ları getirmek istiyorsan boş bırak)

**Dönüş:**
- CircuitBreakerMetrics[] →
  - key: string
  - totalRequests: number
  - failedRequests: number
  - successfulRequests: number
  - failureRate: number (%)
  - averageResponseTime: number
  - status: CircuitBreakerStatus

---

#### ✅ resetCircuit()
**Açıklama:** OPEN olan circuit'i manuel olarak CLOSED'a getir.

**Parametre:**
- key: string

**Dönüş:** Promise<void>

---

### 📌 RetryService

#### ✅ executeWithRetry()
**Açıklama:** Fonksiyonu retry logic'i ile çalıştır. Başarısız olursa tekrar dene.

**Parametre:**
- fn: () => Promise<T> → Çalıştırılacak function
- options: RetryOptions →
  - maxRetries?: number (default: 3)
  - delay?: number (base delay ms)
  - backoffStrategy?: 'exponential' | 'linear' | 'none'
  - jitter?: boolean (delay'e random ekle?)
  - retryableErrors?: string[] (hangi error'lar retry'lanabilir?)

**Dönüş:** Promise<T>

**Kullanım Senaryosu:**
Database connection retrylemek:
```typescript
const connection = await retryService.executeWithRetry(
  () => pool.connect(),
  {
    maxRetries: 5,
    delay: 1000,
    backoffStrategy: 'exponential',
    jitter: true,
    retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT']
  }
)
// 1s, 2s, 4s, 8s, 16s delay ile 5 kez dener
```

---

#### ✅ getRetryPolicy()
**Açıklama:** Belirli bir operation'ın retry policy'sini getir.

**Parametre:**
- operationName: string ('database-query', 'api-call', 'email-send', etc.)

**Dönüş:** RetryPolicy

---

#### ✅ setRetryPolicy()
**Açıklama:** Belirli bir operation'ın retry policy'sini set et.

**Parametre:**
- operationName: string
- policy: RetryPolicy

**Dönüş:** void

---

#### ✅ exponentialBackoff()
**Açıklama:** Exponential backoff delay'i hesapla (1, 2, 4, 8, 16 seconds).

**Parametre:**
- attemptNumber: number (1. deneme, 2. deneme, etc.)
- baseDelay?: number (default: 1000ms)

**Dönüş:** number (delay in ms)

**Kullanım Senaryosu:**
```typescript
const delay1 = exponentialBackoff(1) // 1000ms
const delay2 = exponentialBackoff(2) // 2000ms
const delay3 = exponentialBackoff(3) // 4000ms
```

---

#### ✅ jitteredBackoff()
**Açıklama:** Exponential backoff + random jitter ekle (thundering herd problem'i çözmek için).

**Parametre:**
- attemptNumber: number
- baseDelay?: number

**Dönüş:** number (jitter'lı delay in ms)

---

### 📌 HealthCheckService

#### ✅ registerHealthCheck()
**Açıklama:** Belirli bir service'in health check'ini register et.

**Parametre:**
- serviceName: string ('database', 'redis', 'payment-api', etc.)
- checkFn: () => Promise<boolean> → Health check fonksiyonu

**Dönüş:** void

**Kullanım Senaryosu:**
```typescript
healthCheckService.registerHealthCheck('database', async () => {
  try {
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
})
```

---

#### ✅ performHealthCheck()
**Açıklama:** Belirli bir service'inin health check'ini çalıştır.

**Parametre:**
- serviceName: string

**Dönüş:**
- Promise<HealthCheckResult> →
  - serviceName: string
  - status: 'healthy' | 'unhealthy'
  - responseTime: number (ms)
  - lastCheckedAt: Date

---

#### ✅ getAllHealthStatus()
**Açıklama:** Tüm registered service'lerin health status'unu getir.

**Parametre:** Yok

**Dönüş:**
- Promise<Record<string, HealthCheckResult>>

**Kullanım Senaryosu:**
Health check endpoint:
```typescript
app.get('/health', async (req, res) => {
  const health = await healthCheckService.getAllHealthStatus()
  const allHealthy = Object.values(health).every(h => h.status === 'healthy')
  res.status(allHealthy ? 200 : 503).json(health)
})
```

---

#### ✅ getUnhealthyServices()
**Açıklama:** Sağlıksız olan service'leri getir.

**Parametre:** Yok

**Dönüş:** Promise<string[]> (unhealthy service adları)

---

### 📌 Types

```typescript
type CircuitBreakerStatus = {
  state: 'closed' | 'open' | 'half-open'
  failureCount: number
  successCount: number
  lastFailureTime?: Date
  nextRetryTime?: Date
}

type CircuitBreakerMetrics = {
  key: string
  totalRequests: number
  failedRequests: number
  successfulRequests: number
  failureRate: number             // %
  averageResponseTime: number     // ms
  status: CircuitBreakerStatus
}

type RetryOptions = {
  maxRetries?: number             // Default: 3
  delay?: number                  // Base delay ms
  backoffStrategy?: 'exponential' | 'linear' | 'none'
  jitter?: boolean
  retryableErrors?: string[]      // Error code'ları
}

type RetryPolicy = {
  operationName: string
  maxRetries: number
  baseDelay: number
  backoffStrategy: 'exponential' | 'linear' | 'none'
  timeout?: number
}

type HealthCheckResult = {
  serviceName: string
  status: 'healthy' | 'unhealthy'
  responseTime: number            // ms
  lastCheckedAt: Date
  consecutiveFailures?: number
  error?: string
}

type CBOptions = {
  failureThreshold?: number
  resetTimeout?: number
  halfOpenRequests?: number
}
```

---

# 📊 TIER 2: UTILITIES (Continuation...)

(Devamı bir sonraki message'da yazılacak - Character limit'i geçmesin diye)

---

## 💡 Project Development Strategy

### Phase 1: Foundation (Months 1-2)
- aegis-audit tamamıyla implement et
- aegis-observability tamamıyla implement et
- aegis-resilience tamamıyla implement et

### Phase 2: Utilities (Months 3-4)
- aegis-cache, aegis-validation, aegis-queue, aegis-security implement et

### Phase 3: Integration (Months 5-6)
- aegis-starter-template, aegis-cli, aegis-docs

### Phase 4: Advanced (Months 7-9)
- aegis-testing, aegis-performance, aegis-migration

### Phase 5: Hardening (Months 9+)
- Security audit
- Load testing
- Production deployment

---

# 🛡️ AEGIS - TIER 2, 3, 4 COMPLETE SPECIFICATION

---

# 📊 TIER 2: UTILITIES LIBRARIES

---

## 4️⃣ **aegis-cache** - Smart Caching & Invalidation

### 📌 Decorator

#### ✅ @Cacheable()
**Açıklama:** Bir method'ın sonucunu Redis'e cache'le. Aynı parametrelerle çağrıldığında cache'ten dön.

**Parametre:**
```typescript
options: {
  ttl?: number                    // Cache süresi (saniye), Default: 3600
  key?: string | ((...args) => string)  // Cache key pattern
  invalidateOn?: string[]         // Hangi event'lerde cache invalidate et?
  tags?: string[]                 // Cache tags (bulk invalidation için)
  condition?: (...args) => boolean // Cache et mi, et me mi? (conditional)
}
```

**Dönüş:** Decorator

**Kullanım Senaryosu:**
```typescript
class UserService {
  @Cacheable({ 
    ttl: 3600,
    key: (id) => `user:${id}`,
    tags: ['user'],
    invalidateOn: ['user.updated', 'user.deleted']
  })
  async getUserById(id: string) {
    // Veritabanından getir
    return db.user.findUnique({ where: { id } })
  }
}
```

---

#### ✅ @CacheInvalidate()
**Açıklama:** Bir method çağrıldığında, belirli cache key'lerini/tag'lerini invalidate et.

**Parametre:**
```typescript
options: {
  key: string | ((...args) => string)  // Invalidate edilecek key
  tags?: string[]                      // Invalidate edilecek tag'ler
  pattern?: RegExp                     // Regex pattern ile invalidate
}
```

**Dönüş:** Decorator

**Kullanım Senaryosu:**
```typescript
class UserService {
  @CacheInvalidate({ 
    tags: ['user']  // Tüm user tag'lı cache'leri sil
  })
  async updateUser(id: string, data: UpdateUserDto) {
    return db.user.update({ where: { id }, data })
  }
}
```

---

### 📌 Cache Service

#### ✅ get()
**Açıklama:** Redis'ten value'yu getir.

**Parametre:**
- key: string → Cache key

**Dönüş:**
- Promise<T | null> → Bulundu ise value, yoksa null

**Kullanım Senaryosu:**
```typescript
const user = await cacheService.get<User>('user:123')
if (!user) {
  const user = await db.user.findUnique({ where: { id: '123' } })
  await cacheService.set('user:123', user, 3600)
}
```

---

#### ✅ set()
**Açıklama:** Redis'te key-value sakla.

**Parametre:**
- key: string
- value: T → Saklanacak value
- ttl?: number → Saniye cinsinden (default: 3600)

**Dönüş:** Promise<void>

---

#### ✅ del()
**Açıklama:** Cache key'ini sil.

**Parametre:**
- key: string

**Dönüş:** Promise<boolean> (silindi mi?)

---

#### ✅ exists()
**Açıklama:** Key Redis'te var mı?

**Parametre:**
- key: string

**Dönüş:** Promise<boolean>

---

#### ✅ getMany()
**Açıklama:** Birden fazla key'i bir seferde getir.

**Parametre:**
- keys: string[]

**Dönüş:** Promise<Record<string, T>>

**Kullanım Senaryosu:**
```typescript
const users = await cacheService.getMany(['user:1', 'user:2', 'user:3'])
// { 'user:1': {...}, 'user:2': {...}, 'user:3': {...} }
```

---

#### ✅ setMany()
**Açıklama:** Birden fazla key-value'yi bir seferde sakla.

**Parametre:**
- entries: Record<string, T>
- ttl?: number

**Dönüş:** Promise<void>

---

#### ✅ delMany()
**Açıklama:** Birden fazla key'i sil.

**Parametre:**
- keys: string[]

**Dönüş:** Promise<number> (silinen key sayısı)

---

#### ✅ delPattern()
**Açıklama:** Regex pattern'e uyan tüm key'leri sil.

**Parametre:**
- pattern: string (örn: 'user:*', 'session:*')

**Dönüş:** Promise<number> (silinen key sayısı)

**Kullanım Senaryosu:**
```typescript
await cacheService.delPattern('user:*')
// Tüm user cache'lerini sil
```

---

#### ✅ invalidateByTag()
**Açıklama:** Belirli bir tag'e sahip tüm cache'leri sil.

**Parametre:**
- tag: string

**Dönüş:** Promise<number> (silinen key sayısı)

**Kullanım Senaryosu:**
```typescript
await cacheService.invalidateByTag('product')
// Tüm product cache'lerini sil
```

---

#### ✅ clear()
**Açıklama:** Tüm cache'i temizle.

**Parametre:** Yok

**Dönüş:** Promise<void>

---

#### ✅ getStats()
**Açıklama:** Cache istatistik'lerini getir (hits, misses, etc.)

**Parametre:** Yok

**Dönüş:**
- Promise<CacheStats> →
  - hits: number
  - misses: number
  - hitRate: number (%)
  - evictions: number
  - memoryUsage: number (bytes)
  - keyCount: number

---

### 📌 Cache Invalidation Service

#### ✅ onDataChange()
**Açıklama:** Data değiştiğinde (DB update sonra) ilgili cache'leri otomatik invalidate et.

**Parametre:**
- entityType: string ('User', 'Product', 'Order')
- action: string ('create', 'update', 'delete')
- entityId: string

**Dönüş:** Promise<void>

**Kullanım Senaryosu:**
```typescript
// User update olurken (database after trigger veya service'de):
await cacheInvalidationService.onDataChange('User', 'update', 'user-123')
// user:123, user:list, user:* pattern'ler invalidate edilir
```

---

#### ✅ invalidateEntityCache()
**Açıklama:** Belirli bir entity'nin tüm cache'lerini invalidate et.

**Parametre:**
- entityType: string
- entityId?: string (optional, belirtilmezse tüm entity type'ı invalidate et)

**Dönüş:** Promise<number> (silinen key sayısı)

---

#### ✅ warmCache()
**Açıklama:** Cache'i önceden doldurmak (warming). Veritabanından getir, cache'te sakla.

**Parametre:**
- keys: string[]
- fetcher: (key: string) => Promise<any> → Her key için data fetch eden function

**Dönüş:** Promise<void>

**Kullanım Senaryosu:**
```typescript
await cacheInvalidationService.warmCache(
  ['product:1', 'product:2', 'product:3'],
  async (key) => {
    const id = key.split(':')[1]
    return db.product.findUnique({ where: { id } })
  }
)
```

---

#### ✅ getInvalidationStrategy()
**Açıklama:** Entity tipi için invalidation strategy'sini getir.

**Parametre:**
- entityType: string

**Dönüş:**
- InvalidationStrategy ('write-through' | 'cache-aside' | 'write-behind')

---

#### ✅ setInvalidationRule()
**Açıklama:** Belirli entity tipi için invalidation rule'u set et.

**Parametre:**
- entityType: string
- rule: InvalidationRule →
  - trigger: 'immediate' | 'delayed'
  - delay?: number (ms)
  - cascadeInvalidate?: string[] (başka hangi cache'ler invalidate olsun?)

**Dönüş:** void

**Kullanım Senaryosu:**
```typescript
cacheInvalidationService.setInvalidationRule('Order', {
  trigger: 'immediate',
  cascadeInvalidate: ['user-orders', 'order-stats']
})
// Order invalidate olursa, user-orders ve order-stats da invalidate olur
```

---

### 📌 Types

```typescript
type CacheStats = {
  hits: number
  misses: number
  hitRate: number               // %
  evictions: number
  memoryUsage: number           // bytes
  keyCount: number
}

type InvalidationStrategy = 'write-through' | 'cache-aside' | 'write-behind'

type InvalidationRule = {
  entityType: string
  trigger: 'immediate' | 'delayed'
  delay?: number                // ms
  cascadeInvalidate?: string[]  // Başka hangi entity'ler invalidate olsun?
}
```

---

## 5️⃣ **aegis-validation** - Zod + gRPC Validation Bridge

### 📌 Middleware

#### ✅ validationMiddleware()
**Açıklama:** Express/Fastify request'ini Zod schema'ya karşı validate et.

**Parametre:**
```typescript
options?: {
  stripUnknown?: boolean        // Unknown field'ları sil (default: true)
  abortEarly?: boolean          // İlk error'da dur (default: false)
  throwOnError?: boolean        // Error throw et, vs. error response döndür
}
```

**Dönüş:** Middleware function

**Kullanım Senaryosu:**
```typescript
app.use(validationMiddleware({ stripUnknown: true }))

app.post('/users', validateRequest(createUserSchema), (req, res) => {
  // req.body otomatik validated ve sanitized
})
```

---

### 📌 Validator Service

#### ✅ validate()
**Açıklama:** Data'yı Zod schema'ya karşı validate et (synchronous).

**Parametre:**
- data: unknown
- schema: ZodSchema

**Dönüş:**
- ValidationResult →
  - valid: boolean
  - data?: any (validated data)
  - errors?: ValidationError[]

---

#### ✅ validateAsync()
**Açıklama:** Data'yı Zod schema'ya karşı validate et (async, custom validation için).

**Parametre:**
- data: unknown
- schema: ZodSchema

**Dönüş:** Promise<ValidationResult>

---

#### ✅ sanitize()
**Açıklama:** Data'yı schema'ya göre sanitize et (trim, type convert, etc.)

**Parametre:**
- data: unknown
- schema: ZodSchema

**Dönüş:** SanitizedData (cleaned data)

---

#### ✅ parseRequest()
**Açıklama:** Express Request'in body, params, query'sini validate et.

**Parametre:**
- req: Request
- schema: ZodSchema (body schema)

**Dönüş:**
- Promise<ParsedRequest> →
  - body?: any
  - params?: any
  - query?: any
  - headers?: any

---

#### ✅ parseResponse()
**Açıklama:** Response data'sını schema'ya göre validate et (response type safety).

**Parametre:**
- data: unknown
- schema: ZodSchema

**Dönüş:**
- ParsedResponse →
  - valid: boolean
  - data?: any

---

#### ✅ getSchemaErrors()
**Açıklama:** Validation error'larını detailed olarak getir.

**Parametre:**
- data: unknown
- schema: ZodSchema

**Dönüş:** ValidationError[]

---

#### ✅ formatErrors()
**Açıklama:** Zod error'larını readable format'a dönüştür.

**Parametre:**
- errors: ZodError

**Dönüş:**
- FormattedErrors → { [fieldName]: string | string[] }

**Kullanım Senaryosu:**
```typescript
const formatted = validatorService.formatErrors(zodError)
// { email: 'Invalid email', age: ['Must be >= 18', 'Must be <= 120'] }
```

---

### 📌 Proto Generator Service

#### ✅ generateProtoFromZod()
**Açıklama:** Zod schema'dan gRPC .proto message'ı otomatik generate et.

**Parametre:**
- zodSchema: ZodSchema
- messageName: string

**Dönüş:** string (proto syntax)

**Kullanım Senaryosu:**
```typescript
const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().min(0)
})

const proto = protoGeneratorService.generateProtoFromZod(userSchema, 'User')
// message User {
//   string id = 1;
//   string email = 2;
//   int32 age = 3;
// }
```

---

#### ✅ generateProtosFromSchemas()
**Açıklama:** Birden fazla Zod schema'dan proto file'ları generate et.

**Parametre:**
- schemas: Record<string, ZodSchema>

**Dönüş:** Record<string, string> (proto contents)

---

#### ✅ writeProtoFile()
**Açıklama:** Proto content'i file'a yaz.

**Parametre:**
- content: string
- filePath: string

**Dönüş:** Promise<void>

---

#### ✅ compileProtos()
**Açıklama:** Proto dosyalarını derle (TypeScript type'ları generate et).

**Parametre:**
- protoDir: string

**Dönüş:**
- Promise<CompiledProtos> →
  - files: Record<string, any> (compiled proto files)
  - types: Record<string, any> (TypeScript types)

---

### 📌 Types

```typescript
type ValidationResult = {
  valid: boolean
  data?: any
  errors?: ValidationError[]
}

type ValidationError = {
  path: string[]             // ['user', 'email']
  message: string
  code: string               // 'invalid_email', 'too_small'
}

type FormattedErrors = {
  [path: string]: string | string[]
}

type ParsedRequest = {
  body?: any
  params?: any
  query?: any
  headers?: any
}

type ParsedResponse = {
  valid: boolean
  data?: any
}

type CompiledProtos = {
  files: Record<string, any>
  types: Record<string, any>
}
```

---

## 6️⃣ **aegis-queue** - BullMQ Wrapper + Smart DLQ

### 📌 Decorator

#### ✅ @QueueJob()
**Açıklama:** Method'u queue job'a dönüştür. Otomatik retry, DLQ, timeout.

**Parametre:**
```typescript
queueName: string
options?: {
  priority?: number             // Job priority (1-100)
  attempts?: number             // Retry attempts, Default: 3
  backoff?: BackoffOptions      // Retry backoff strategy
  timeout?: number              // Job timeout (ms)
  removeOnSuccess?: boolean     // İşlem bittikten sonra job'u sil?
  removeOnFail?: boolean        // Başarısız olursa job'u sil?
}
```

**Dönüş:** Decorator

**Kullanım Senaryosu:**
```typescript
class EmailService {
  @QueueJob('email-queue', {
    priority: 10,
    attempts: 3,
    timeout: 30000
  })
  async sendEmail(email: string, template: string) {
    // Email gönder
  }
}

// Kullanım:
await emailService.sendEmail('user@example.com', 'welcome')
// Otomatik queue'ye eklenir, retry + timeout ile işlenir
```

---

### 📌 Queue Service

#### ✅ addJob()
**Açıklama:** Queue'ye yeni job ekle.

**Parametre:**
- queueName: string
- data: any → Job data
- options?: JobOptions

**Dönüş:**
- Promise<Job> →
  - id: string
  - queueName: string
  - data: any
  - status: 'pending' | 'active' | 'completed' | 'failed'
  - attempts: number

---

#### ✅ addJobBatch()
**Açıklama:** Birden fazla job'u bir seferde ekle.

**Parametre:**
- queueName: string
- jobs: JobData[]

**Dönüş:** Promise<Job[]>

**Kullanım Senaryosu:**
```typescript
const jobs = [
  { email: 'user1@example.com', template: 'welcome' },
  { email: 'user2@example.com', template: 'welcome' },
  { email: 'user3@example.com', template: 'welcome' }
]
await queueService.addJobBatch('email-queue', jobs)
```

---

#### ✅ getJob()
**Açıklama:** Belirli bir job'ı getir.

**Parametre:**
- queueName: string
- jobId: string

**Dönüş:** Promise<Job | null>

---

#### ✅ getJobStatus()
**Açıklama:** Job'un current status'unu getir.

**Parametre:**
- queueName: string
- jobId: string

**Dönüş:**
- Promise<JobStatus> ('pending' | 'active' | 'completed' | 'failed' | 'delayed')

---

#### ✅ cancelJob()
**Açıklama:** Pending job'u cancel et.

**Parametre:**
- queueName: string
- jobId: string

**Dönüş:** Promise<boolean> (cancelled mi?)

---

#### ✅ retryJob()
**Açıklama:** Failed job'u retry et.

**Parametre:**
- queueName: string
- jobId: string

**Dönüş:** Promise<Job>

---

#### ✅ getQueueStats()
**Açıklama:** Queue'nin istatistik'lerini getir.

**Parametre:**
- queueName: string

**Dönüş:**
- Promise<QueueStats> →
  - queueName: string
  - pending: number
  - active: number
  - completed: number
  - failed: number
  - delayed: number
  - totalProcessed: number

---

#### ✅ getQueueMetrics()
**Açıklama:** Tüm queue'lerin metric'lerini getir.

**Parametre:** Yok

**Dönüş:** Promise<QueueMetrics>

---

#### ✅ pauseQueue()
**Açıklama:** Queue'yi pause et (yeni job'lar accept etme).

**Parametre:**
- queueName: string

**Dönüş:** Promise<void>

---

#### ✅ resumeQueue()
**Açıklama:** Pause'a alınmış queue'yi resume et.

**Parametre:**
- queueName: string

**Dönüş:** Promise<void>

---

#### ✅ drainQueue()
**Açıklama:** Queue'yi drain et (tüm job'ları temizle).

**Parametre:**
- queueName: string

**Dönüş:** Promise<number> (silinen job sayısı)

---

### 📌 DLQ Service (Dead Letter Queue)

#### ✅ getFailedJobs()
**Açıklama:** Queue'deki failed job'ları getir.

**Parametre:**
- queueName: string
- filters?: DLQFilters →
  - errorType?: string
  - startDate?: Date
  - endDate?: Date

**Dönüş:** Promise<FailedJob[]>

---

#### ✅ classifyFailure()
**Açıklama:** Job failure'ını classify et (retriable, permanent, unknown).

**Parametre:**
- job: Job
- error: Error

**Dönüş:**
- FailureClassification →
  - type: 'retriable' | 'permanent' | 'unknown'
  - reason: string
  - suggestion?: string

**Kullanım Senaryosu:**
```typescript
const classification = dlqService.classifyFailure(job, error)
// type: 'retriable', reason: 'ETIMEDOUT', suggestion: 'Increase timeout'
// type: 'permanent', reason: 'Invalid email', suggestion: 'Manual review needed'
```

---

#### ✅ retryFailedJob()
**Açıklama:** Failed job'u retry et (strategy ile).

**Parametre:**
- queueName: string
- jobId: string
- strategy?: RetryStrategy →
  - immediateRetry?: boolean
  - newAttempts?: number
  - priority?: number

**Dönüş:** Promise<Job>

---

#### ✅ bulkRetryFailedJobs()
**Açıklama:** Birden fazla failed job'u retry et.

**Parametre:**
- queueName: string
- filters?: DLQFilters

**Dönüş:** Promise<number> (retry'lanan job sayısı)

---

#### ✅ moveToArchive()
**Açıklama:** Failed job'u archive'a taşı (DLQ'dan çıkart).

**Parametre:**
- queueName: string
- jobId: string

**Dönüş:** Promise<void>

---

#### ✅ getFailureStats()
**Açıklama:** Queue failure'larının istatistik'lerini getir.

**Parametre:**
- queueName?: string (optional, tüm queue'ler için)

**Dönüş:**
- Promise<FailureStats> →
  - totalFailed: number
  - byErrorType: Record<string, number>
  - byQueue: Record<string, number>
  - retriableCount: number
  - permanentCount: number

---

#### ✅ exportFailedJobs()
**Açıklama:** Failed job'ları export et (JSON/CSV).

**Parametre:**
- queueName: string
- format: 'json' | 'csv'

**Dönüş:** Promise<Buffer>

---

### 📌 Idempotency Service

#### ✅ ensureIdempotency()
**Açıklama:** Idempotent operation yap (aynı request 2x yapılırsa 1x sonuç).

**Parametre:**
- idempotencyKey: string (unique request ID)
- fn: () => Promise<T>

**Dönüş:** Promise<T>

**Kullanım Senaryosu:**
```typescript
app.post('/transfer', async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key']
  const result = await idempotencyService.ensureIdempotency(
    idempotencyKey,
    () => accountService.transfer(req.body)
  )
  res.json(result)
})
// 2. request aynı idempotencyKey ile gelirse, cache'ten döner
```

---

#### ✅ getIdempotencyResult()
**Açıklama:** Önceki idempotent operation'ın sonucunu getir.

**Parametre:**
- idempotencyKey: string

**Dönüş:** Promise<any | null>

---

#### ✅ setIdempotencyResult()
**Açıklama:** Idempotent operation sonucunu sakla.

**Parametre:**
- idempotencyKey: string
- result: any
- ttl?: number (default: 86400, 1 gün)

**Dönüş:** Promise<void>

---

#### ✅ deleteIdempotencyKey()
**Açıklama:** Idempotency key'ini sil.

**Parametre:**
- idempotencyKey: string

**Dönüş:** Promise<boolean>

---

### 📌 Types

```typescript
type Job = {
  id: string
  queueName: string
  data: any
  status: 'pending' | 'active' | 'completed' | 'failed'
  attempts: number
  maxAttempts: number
  createdAt: Date
  processedAt?: Date
  completedAt?: Date
  failedReason?: string
}

type JobStatus = 'pending' | 'active' | 'completed' | 'failed' | 'delayed'

type QueueStats = {
  queueName: string
  pending: number
  active: number
  completed: number
  failed: number
  delayed: number
  totalProcessed: number
}

type QueueMetrics = {
  totalQueues: number
  totalPending: number
  totalActive: number
  totalCompleted: number
  totalFailed: number
  avgProcessingTime: number
  throughput: number  // jobs/sec
}

type FailureClassification = {
  type: 'retriable' | 'permanent' | 'unknown'
  reason: string
  suggestion?: string
}

type FailureStats = {
  totalFailed: number
  byErrorType: Record<string, number>
  byQueue: Record<string, number>
  retriableCount: number
  permanentCount: number
  lastFailure?: Date
}

type FailedJob = {
  id: string
  queueName: string
  data: any
  error: string
  failedAt: Date
  attempts: number
  classification?: FailureClassification
}

type BackoffOptions = {
  strategy: 'exponential' | 'fixed'
  delay?: number
  multiplier?: number
}

type RetryStrategy = {
  immediateRetry?: boolean
  newAttempts?: number
  priority?: number
}

type DLQFilters = {
  errorType?: string
  startDate?: Date
  endDate?: Date
}
```

---

## 7️⃣ **aegis-security** - Rate Limiting, JWT, Risk Scoring

### 📌 Middleware

#### ✅ rateLimitMiddleware()
**Açıklama:** Express/Fastify'a rate limit middleware'i ekle.

**Parametre:**
```typescript
options?: {
  windowMs?: number             // Time window (ms), Default: 60000 (1 min)
  maxRequests?: number          // Max requests per window, Default: 100
  keyGenerator?: (req) => string // Key generation (user ID, IP, etc.)
  message?: string              // Error message
  skipSuccessfulRequests?: boolean // Başarılı request'leri count'lama
}
```

**Dönüş:** Middleware function

---

#### ✅ ipBlacklistMiddleware()
**Açıklama:** Blacklist'teki IP'leri block et.

**Parametre:**
```typescript
options?: {
  checkIpHeader?: boolean       // X-Forwarded-For header kontrol et?
  strictMode?: boolean          // Match'lenmeyen IP'ler reject mi?
}
```

**Dönüş:** Middleware function

---

#### ✅ riskScoringMiddleware()
**Açıklama:** Her request'in risk score'unu hesapla.

**Parametre:**
```typescript
options?: {
  enableStepUpAuth?: boolean    // Risk yüksekse step-up auth tetikle?
  riskThreshold?: number        // Hangi score'dan itibaren riskli?
}
```

**Dönüş:** Middleware function

---

### 📌 Rate Limiter Service

#### ✅ checkRateLimit()
**Açıklama:** Belirli bir key'in rate limit'ini kontrol et.

**Parametre:**
- key: string (user ID, IP, etc.)
- limit?: number (override global limit)
- window?: number (override global window)

**Dönüş:**
- Promise<RateLimitResult> →
  - allowed: boolean
  - remaining: number (kalan requests)
  - resetAt: Date
  - limit: number

**Kullanım Senaryosu:**
```typescript
app.get('/api/users', async (req, res) => {
  const result = await rateLimitService.checkRateLimit(
    `user:${req.user.id}`,
    100,        // 100 requests
    60000       // per 1 minute
  )
  
  if (!result.allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: result.resetAt
    })
  }
  
  // Process request...
})
```

---

#### ✅ getRateLimitStatus()
**Açıklama:** Belirli bir key'in current status'unu getir.

**Parametre:**
- key: string

**Dönüş:**
- Promise<RateLimitStatus> →
  - key: string
  - requests: number
  - limit: number
  - window: number (ms)
  - resetAt: Date

---

#### ✅ resetRateLimit()
**Açıklama:** Rate limit'i manual reset et.

**Parametre:**
- key: string

**Dönüş:** Promise<void>

---

#### ✅ setGlobalLimit()
**Açıklama:** Global rate limit'i set et (default olarak kullanılacak).

**Parametre:**
- limit: number
- window: number (ms)

**Dönüş:** void

---

#### ✅ getGlobalLimitStatus()
**Açıklama:** Global limit status'unu getir.

**Parametre:** Yok

**Dönüş:** RateLimitStatus

---

#### ✅ bulkCheckRateLimit()
**Açıklama:** Birden fazla key'in rate limit'ini kontrol et.

**Parametre:**
- keys: string[]
- limit?: number
- window?: number

**Dönüş:** Promise<Record<string, RateLimitResult>>

---

### 📌 IP Blacklist Service

#### ✅ addToBlacklist()
**Açıklama:** IP'yi blacklist'e ekle.

**Parametre:**
- ip: string
- reason?: string
- expiresAt?: Date (temporary blacklist için)

**Dönüş:** Promise<void>

---

#### ✅ removeFromBlacklist()
**Açıklama:** IP'yi blacklist'ten çıkart.

**Parametre:**
- ip: string

**Dönüş:** Promise<boolean> (çıkartıldı mı?)

---

#### ✅ isBlacklisted()
**Açıklama:** IP blacklist'te mi?

**Parametre:**
- ip: string

**Dönüş:** Promise<boolean>

---

#### ✅ getBlacklist()
**Açıklama:** Blacklist'i getir.

**Parametre:**
- options?: BlacklistOptions →
  - includeExpired?: boolean
  - limit?: number
  - offset?: number

**Dönüş:** Promise<BlacklistedIp[]>

---

#### ✅ importBlacklist()
**Açıklama:** Birden fazla IP'yi blacklist'e ekle.

**Parametre:**
- ips: string[]

**Dönüş:** Promise<number> (eklenen IP sayısı)

---

#### ✅ exportBlacklist()
**Açıklama:** Blacklist'i export et.

**Parametre:**
- format: 'json' | 'csv' | 'txt'

**Dönüş:** Promise<Buffer>

---

### 📌 JWT Service

#### ✅ generateToken()
**Açıklama:** Access token generate et.

**Parametre:**
- payload: any
- options?: JwtOptions →
  - expiresIn?: string | number ('1h', 3600)
  - issuer?: string
  - audience?: string

**Dönüş:** string (JWT token)

**Kullanım Senaryosu:**
```typescript
const token = jwtService.generateToken(
  { sub: 'user-123', role: 'admin' },
  { expiresIn: '1h' }
)
```

---

#### ✅ generateRefreshToken()
**Açıklama:** Refresh token generate et.

**Parametre:**
- userId: string
- options?: JwtOptions

**Dönüş:** string

---

#### ✅ verifyToken()
**Açıklama:** Token'ı verify et ve payload'ı getir.

**Parametre:**
- token: string

**Dönüş:**
- Promise<TokenPayload> →
  - sub: string
  - iat: number
  - exp: number
  - [key: string]: any

---

#### ✅ revokeToken()
**Açıklama:** Token'ı revoke et (Redis'te blacklist'e ekle).

**Parametre:**
- token: string
- ttl?: number (token exp time'ına kadar valid)

**Dönüş:** Promise<void>

---

#### ✅ isTokenRevoked()
**Açıklama:** Token revoke edilmiş mi?

**Parametre:**
- token: string

**Dönüş:** Promise<boolean>

---

#### ✅ rotateRefreshToken()
**Açıklama:** Eski refresh token'ı invalid et, yeni generate et.

**Parametre:**
- token: string (eski refresh token)

**Dönüş:**
- Promise<TokenPair> →
  - accessToken: string
  - refreshToken: string
  - expiresIn: number

---

#### ✅ getTokenMetadata()
**Açıklama:** Token'ın metadata'sını getir (decode etmeden).

**Parametre:**
- token: string

**Dönüş:**
- TokenMetadata →
  - issuedAt: Date
  - expiresAt: Date
  - isExpired: boolean
  - isRevoked: boolean

---

### 📌 Risk Scoring Service

#### ✅ calculateRiskScore()
**Açıklama:** User activity'nin risk score'unu hesapla.

**Parametre:**
- userId: string
- context: RiskContext →
  - ipAddress?: string
  - userAgent?: string
  - location?: string
  - deviceId?: string
  - previousActivity?: any

**Dönüş:**
- Promise<RiskScore> →
  - userId: string
  - score: number (0-100)
  - level: 'low' | 'medium' | 'high' | 'critical'
  - factors: RiskFactor[] (neden yüksek?)
  - requiresStepUp: boolean

**Kullanım Senaryosu:**
```typescript
const risk = await riskScoringService.calculateRiskScore('user-123', {
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  location: req.location,
  deviceId: req.cookies.deviceId,
  previousActivity: { lastLoginAt: Date.now() - 30 * 24 * 60 * 60 * 1000 } // 30 gün önce
})
// score: 75, level: 'high', requiresStepUp: true
```

---

#### ✅ flagSuspiciousActivity()
**Açıklama:** Şüpheli aktiviteyi flag'le.

**Parametre:**
- userId: string
- activityType: string ('multiple_failed_logins', 'unusual_location', 'bulk_download', etc.)
- severity: 'low' | 'medium' | 'high'

**Dönüş:** Promise<void>

---

#### ✅ requireStepUpAuth()
**Açıklama:** Step-up authentication gerekli mi (2FA, security questions, etc.)?

**Parametre:**
- userId: string
- reason: string

**Dönüş:** Promise<boolean>

---

#### ✅ recordSuccessfulAuth()
**Açıklama:** Başarılı auth'u kaydet (risk score'u azaltmak için).

**Parametre:**
- userId: string
- method: string ('password', '2fa', 'biometric', etc.)

**Dönüş:** Promise<void>

---

#### ✅ recordFailedAuth()
**Açıklama:** Başarısız auth'u kaydet (risk score'u artırmak için).

**Parametre:**
- userId: string
- reason: string ('wrong_password', 'rate_limit', etc.)

**Dönüş:** Promise<void>

---

#### ✅ getRiskHistory()
**Açıklama:** User'ın geçmiş risk event'lerini getir.

**Parametre:**
- userId: string
- limit?: number (default: 100)

**Dönüş:** Promise<RiskEvent[]>

---

### 📌 Types

```typescript
type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: Date
  limit: number
}

type RateLimitStatus = {
  key: string
  requests: number
  limit: number
  window: number              // ms
  resetAt: Date
}

type BlacklistedIp = {
  ip: string
  addedAt: Date
  reason?: string
  expiresAt?: Date
  status: 'active' | 'expired'
}

type TokenPayload = {
  sub: string
  iat: number                 // Issued at (unix timestamp)
  exp: number                 // Expires at (unix timestamp)
  [key: string]: any
}

type TokenPair = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

type TokenMetadata = {
  issuedAt: Date
  expiresAt: Date
  isExpired: boolean
  isRevoked: boolean
}

type RiskScore = {
  userId: string
  score: number               // 0-100
  level: 'low' | 'medium' | 'high' | 'critical'
  factors: RiskFactor[]
  requiresStepUp: boolean
  calculatedAt: Date
}

type RiskFactor = {
  name: string                // 'new_ip', 'new_location', 'multiple_failures'
  weight: number              // 0-100
  description: string
}

type RiskContext = {
  ipAddress?: string
  userAgent?: string
  location?: string
  deviceId?: string
  previousActivity?: any
}

type RiskEvent = {
  userId: string
  type: string
  severity: 'low' | 'medium' | 'high'
  timestamp: Date
  details?: Record<string, any>
}

type JwtOptions = {
  expiresIn?: string | number
  issuer?: string
  audience?: string
}

type BlacklistOptions = {
  includeExpired?: boolean
  limit?: number
  offset?: number
}
```

---

# 🏗️ TIER 3: INTEGRATION

---

## 8️⃣ **aegis-starter-template** - Project Scaffold & Docker Setup

### 📌 CLI Commands

#### ✅ createAegisApp()
**Açıklama:** Yeni Aegis project'ini scaffold et. Docker, CI/CD, env setup hepsi kurulsun.

**Parametre:**
- projectName: string
- options?: {
  - template?: 'basic' | 'microservice' | 'api' (Default: 'basic')
  - database?: 'postgresql' | 'mysql' (Default: 'postgresql')
  - messaging?: 'bullmq' | 'kafka' | 'rabbitmq' (Default: 'bullmq')
  - auth?: 'jwt' | 'oauth2' | 'none'
  - monitoring?: boolean (Prometheus + Grafana? Default: true)
}

**Dönüş:** Promise<void>

**Kullanım Senaryosu:**
```bash
npx create-aegis-app my-payment-api --template microservice --database postgresql --messaging kafka
# Proje yapısı otomatik oluşturulur:
# - src/ (TypeScript kodu)
# - docker-compose.yml (DB + Redis + Kafka)
# - Dockerfile (production)
# - .github/workflows/ (CI/CD)
# - .env.example
# - package.json (tüm dependencies)
```

---

#### ✅ setupDocker()
**Açıklama:** Docker compose setup'ını yap (database, redis, message queue, etc.)

**Parametre:**
- projectDir: string
- services?: string[] (hangi service'ler eklensin? Default: ['postgresql', 'redis'])

**Dönüş:** Promise<void>

**Kullanım Senaryosu:**
```typescript
await setupDocker(process.cwd(), ['postgresql', 'redis', 'kafka', 'grafana'])
// docker-compose.yml oluşturulur ve tüm service'ler tanımlanır
```

---

#### ✅ generateEnv()
**Açıklama:** .env.example'den .env dosyası generate et.

**Parametre:**
- projectDir: string
- template?: string ('development' | 'production')

**Dönüş:** Promise<void>

---

#### ✅ setupGithubActions()
**Açıklama:** GitHub Actions workflow'ları setup et (CI/CD).

**Parametre:**
- projectDir: string

**Dönüş:** Promise<void>

**Ortaya çıkan files:**
- .github/workflows/lint.yml (ESLint)
- .github/workflows/test.yml (Jest)
- .github/workflows/build.yml (Build)
- .github/workflows/deploy.yml (Deploy to production)

---

### 📌 Template Config

```typescript
type TemplateConfig = {
  name: string                  // 'basic-api', 'microservice', etc.
  description: string
  docker: DockerConfig
  dependencies: string[]        // npm packages
  devDependencies: string[]
  scripts: Record<string, string>  // package.json scripts
  env: Record<string, string>
  folders: string[]             // Oluşturulacak klasörler
}

type DockerConfig = {
  services: string[]
  volumes?: Record<string, any>
  networks?: Record<string, any>
}
```

---

## 9️⃣ **aegis-cli** - Command Line Tools

### 📌 Commands

#### ✅ scaffold()
**Açıklama:** Yeni Aegis project'i scaffold et.

**Parametre:**
- projectName: string
- options: ScaffoldOptions

**Dönüş:** Promise<void>

**Kullanım Senaryosu:**
```bash
aegis scaffold --name my-api --template microservice --db postgresql
```

---

#### ✅ migrate()
**Açıklama:** Database migration'larını run et (up/down).

**Parametre:**
- direction: 'up' | 'down'
- count?: number (kaç tane migration?

**Dönüş:**
- Promise<MigrationResult> →
  - direction: string
  - applied: number (kaç migration run edildi)
  - migrations: string[] (migration adları)

**Kullanım Senaryosu:**
```bash
aegis migrate up 2        # Son 2 migration'ı run et
aegis migrate down 1      # Son 1 migration'ı rollback et
```

---

#### ✅ audit-export()
**Açıklama:** Audit trail'ı export et.

**Parametre:**
- filters: AuditFilters
- format: 'json' | 'csv' | 'pdf'

**Dönüş:** Promise<Buffer>

**Kullanım Senaryosu:**
```bash
aegis audit-export --user user-123 --format pdf --output audit.pdf
```

---

#### ✅ health-check()
**Açıklama:** Sistem health check'ini çalıştır.

**Parametre:**
- serviceName?: string

**Dönüş:** Promise<HealthStatus[]>

**Kullanım Senaryosu:**
```bash
aegis health-check                # Tüm service'leri kontrol et
aegis health-check --service database  # Sadece database
```

---

#### ✅ benchmark()
**Açıklama:** API endpoint'ine load test çalıştır.

**Parametre:**
- endpoint: string
- options: BenchmarkOptions →
  - method?: string ('GET', 'POST', default: 'GET')
  - concurrency?: number (kaç concurrent request, default: 100)
  - duration?: number (kaç saniye, default: 60)
  - payload?: any (POST data)

**Dönüş:** Promise<BenchmarkReport>

**Kullanım Senaryosu:**
```bash
aegis benchmark http://localhost:3000/api/users --concurrency 500 --duration 120
# 500 concurrent request, 2 dakika, raport üret
```

---

#### ✅ config()
**Açıklama:** Configuration'ı yönet (set/get/list).

**Parametre:**
- action: 'set' | 'get' | 'list'
- key?: string
- value?: string

**Dönüş:** Promise<any>

**Kullanım Senaryosu:**
```bash
aegis config set DATABASE_URL postgresql://localhost/mydb
aegis config get DATABASE_URL
aegis config list
```

---

#### ✅ db-seed()
**Açıklama:** Database'i seed data ile doldur.

**Parametre:**
- seedName?: string (spesifik seed mi, yoksa tümü?)

**Dönüş:** Promise<number> (inserted record sayısı)

**Kullanım Senaryosu:**
```bash
aegis db-seed                # Tüm seeds'leri run et
aegis db-seed users          # Sadece users seed'i
```

---

#### ✅ generate-docs()
**Açıklama:** Dokumentasyon generate et.

**Parametre:**
- type: 'api' | 'architecture'
- output: string (output directory)

**Dönüş:** Promise<void>

**Kullanım Senaryosu:**
```bash
aegis generate-docs --type api --output ./docs
# OpenAPI docs generate edilir
```

---

## 🔟 **aegis-docs** - Documentation Generator

### 📌 Generation Service

#### ✅ generateApiDocs()
**Açıklama:** OpenAPI (Swagger) documentation generate et.

**Parametre:**
- schemaPath: string (Zod schema'ları)
- outputPath: string

**Dönüş:** Promise<void>

---

#### ✅ generateArchitectureDocs()
**Açıklama:** System architecture documentation oluştur.

**Parametre:**
- configPath: string

**Dönüş:** Promise<string> (markdown content)

---

#### ✅ generateCodeExamples()
**Açıklama:** Library'ler için code example'ları generate et.

**Parametre:**
- libraryName: string

**Dönüş:** Promise<CodeExample[]>

---

#### ✅ generateMigrationGuide()
**Açıklama:** Version upgrade migration guide'ını oluştur.

**Parametre:**
- fromVersion: string
- toVersion: string

**Dönüş:** Promise<string> (markdown)

---

#### ✅ generateADR()
**Açıklama:** Architecture Decision Record oluştur.

**Parametre:**
- decision: string (başlık)
- context: string (neden alındı?)
- consequences: string (sonuçları ne?)

**Dönüş:**
- Promise<ADR> →
  - id: string
  - date: Date
  - title: string
  - status: 'proposed' | 'accepted' | 'deprecated'
  - content: string (markdown)

---

---

# 🔧 TIER 4: ADVANCED

---

## 1️⃣1️⃣ **aegis-testing** - Test Utilities

### 📌 Test Utilities

#### ✅ createTestDatabase()
**Açıklama:** Test için isolated database instance oluştur.

**Parametre:**
- config?: TestDbConfig →
  - template?: 'postgresql' | 'mysql' (default: 'postgresql')
  - isolate?: boolean (her test için clean DB? default: true)

**Dönüş:**
- Promise<TestDatabase> →
  - connect: () => Promise<void>
  - disconnect: () => Promise<void>
  - query: (sql: string, params?: any[]) => Promise<any>
  - transaction: (fn: () => Promise<void>) => Promise<void>
  - reset: () => Promise<void>

---

#### ✅ createTestRedis()
**Açıklama:** Test için Redis instance oluştur (in-memory veya Docker).

**Parametre:**
- config?: TestRedisConfig

**Dönüş:**
- Promise<TestRedis> →
  - connect: () => Promise<void>
  - disconnect: () => Promise<void>
  - flushdb: () => Promise<void>

---

#### ✅ seedDatabase()
**Açıklama:** Test database'ine seed data'yı yükle.

**Parametre:**
- db: TestDatabase
- fixtures: Fixture[] →
  - table: string
  - data: Record<string, any>[]

**Dönüş:** Promise<void>

---

#### ✅ cleanupDatabase()
**Açıklama:** Test tamamlandıktan sonra database'i temizle.

**Parametre:**
- db: TestDatabase

**Dönüş:** Promise<void>

---

#### ✅ mockGrpcCall()
**Açıklama:** gRPC call'ını mock'la (test için).

**Parametre:**
- serviceName: string ('PaymentService')
- method: string ('processPayment')
- response: any (mock response)

**Dönüş:** void

---

#### ✅ createMockRequest()
**Açıklama:** Mock Express Request object oluştur.

**Parametre:**
- options?: RequestOptions →
  - method?: string
  - path?: string
  - body?: any
  - headers?: Record<string, string>
  - user?: any

**Dönüş:** Request (Express Request'e benzer)

---

#### ✅ createMockResponse()
**Açıklama:** Mock Express Response object oluştur.

**Parametre:** Yok

**Dönüş:** Response (Express Response'e benzer)

---

#### ✅ createRequestContext()
**Açıklama:** Request context oluştur (correlationId, user, etc.).

**Parametre:**
- options?: ContextOptions →
  - userId?: string
  - correlationId?: string
  - role?: string

**Dönüş:** RequestContext

---

### 📌 Types

```typescript
type TestDatabase = {
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  query: (sql: string, params?: any[]) => Promise<any>
  transaction: (fn: () => Promise<void>) => Promise<void>
  reset: () => Promise<void>
}

type TestRedis = {
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  flushdb: () => Promise<void>
}

type Fixture = {
  table: string
  data: Record<string, any>[]
}

type TestDbConfig = {
  template?: 'postgresql' | 'mysql'
  isolate?: boolean
}

type RequestOptions = {
  method?: string
  path?: string
  body?: any
  headers?: Record<string, string>
  user?: any
}

type ContextOptions = {
  userId?: string
  correlationId?: string
  role?: string
}
```

---

## 1️⃣2️⃣ **aegis-performance** - Profilers & Load Testing

### 📌 Profilers

#### ✅ profileDbQuery()
**Açıklama:** Database query'nin performance'ını profile et.

**Parametre:**
- query: string

**Dönüş:**
- Promise<QueryProfile> →
  - query: string
  - executionTime: number (ms)
  - rowsAffected: number
  - indexUsed?: string
  - slowQuery: boolean

---

#### ✅ profileEndpoint()
**Açıklama:** API endpoint'inin performance'ını profile et (multiple samplings).

**Parametre:**
- endpoint: string
- method: string
- samples?: number (default: 100)

**Dönüş:**
- Promise<EndpointProfile> →
  - endpoint: string
  - method: string
  - avgLatency: number
  - minLatency: number
  - maxLatency: number
  - p95Latency: number
  - p99Latency: number

---

#### ✅ detectMemoryLeak()
**Açıklama:** Memory leak tespit et (heap snapshot'larını analiz et).

**Parametre:**
- options?: LeakDetectionOptions →
  - interval?: number (snapshot interval ms)
  - duration?: number (test süresi)
  - threshold?: number (memory growth threshold)

**Dönüş:**
- Promise<MemoryLeakReport> →
  - suspected: boolean
  - heapSize: number
  - trend: 'stable' | 'growing' | 'shrinking'
  - suspiciousAllocations: Allocation[]

---

#### ✅ loadTest()
**Açıklama:** Endpoint'e load test çalıştır.

**Parametre:**
- endpoint: string
- config: LoadTestConfig →
  - method?: string
  - concurrency?: number
  - duration?: number (seconds)
  - rps?: number (requests per second)
  - payload?: any

**Dönüş:**
- Promise<LoadTestReport> →
  - endpoint: string
  - totalRequests: number
  - successfulRequests: number
  - failedRequests: number
  - averageLatency: number
  - p95Latency: number
  - p99Latency: number
  - throughput: number (req/sec)
  - errors: Record<string, number>

---

#### ✅ detectPerformanceRegression()
**Açıklama:** Performance metric'te regression var mı tespit et.

**Parametre:**
- metric: string ('request_latency', 'error_rate')
- baseline: number (önceki benchmark value)

**Dönüş:**
- Promise<RegressionDetection> →
  - hasRegression: boolean
  - currentValue: number
  - baselineValue: number
  - changePercentage: number
  - severity: 'low' | 'medium' | 'high'

---

#### ✅ getBenchmarkReport()
**Açıklama:** Tüm benchmark'ları içeren report.

**Parametre:** Yok

**Dönüş:** Promise<BenchmarkReport>

---

### 📌 Types

```typescript
type QueryProfile = {
  query: string
  executionTime: number          // ms
  rowsAffected: number
  indexUsed?: string
  slowQuery: boolean
}

type EndpointProfile = {
  endpoint: string
  method: string
  avgLatency: number
  minLatency: number
  maxLatency: number
  p95Latency: number
  p99Latency: number
  sampleCount: number
}

type MemoryLeakReport = {
  suspected: boolean
  heapSize: number
  trend: 'stable' | 'growing' | 'shrinking'
  suspiciousAllocations: Allocation[]
  growthPercentage?: number
}

type Allocation = {
  constructor: string
  count: number
  size: number
}

type LoadTestReport = {
  endpoint: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageLatency: number
  minLatency: number
  maxLatency: number
  p95Latency: number
  p99Latency: number
  throughput: number            // req/sec
  errors: Record<string, number>
  startTime: Date
  endTime: Date
  duration: number
}

type RegressionDetection = {
  hasRegression: boolean
  currentValue: number
  baselineValue: number
  changePercentage: number
  severity: 'low' | 'medium' | 'high'
  detectedAt: Date
}

type LeakDetectionOptions = {
  interval?: number
  duration?: number
  threshold?: number
}

type LoadTestConfig = {
  method?: string
  concurrency?: number
  duration?: number
  rps?: number
  payload?: any
}

type BenchmarkReport = {
  timestamp: Date
  endpoints: EndpointProfile[]
  databaseQueries: QueryProfile[]
  memoryStatus: MemoryLeakReport
  summary: {
    bestEndpoint: string
    worstEndpoint: string
    averageLatency: number
  }
}
```

---

## 1️⃣3️⃣ **aegis-migration** - Database Migrations

### 📌 Migration Services

#### ✅ createMigration()
**Açıklama:** Yeni migration file'ı oluştur.

**Parametre:**
- name: string (örn: 'add_email_to_users')
- type: 'sql' | 'data'

**Dönüş:**
- Promise<Migration> →
  - id: string
  - name: string
  - version: string (timestamp)
  - type: 'sql' | 'data'
  - status: 'pending'
  - createdAt: Date

---

#### ✅ runMigration()
**Açıklama:** Migration'ı çalıştır (up).

**Parametre:**
- version: string

**Dönüş:**
- Promise<MigrationResult> →
  - version: string
  - status: 'completed' | 'failed'
  - duration: number (ms)
  - appliedAt: Date
  - error?: string

---

#### ✅ rollbackMigration()
**Açıklama:** Migration'ı rollback et (down).

**Parametre:**
- steps?: number (default: 1)

**Dönüş:** Promise<MigrationResult>

---

#### ✅ getMigrationStatus()
**Açıklama:** Migration status'unu getir (hangileri applied, hangiler pending).

**Parametre:** Yok

**Dönüş:**
- Promise<MigrationStatus> →
  - currentVersion: string
  - pendingMigrations: Migration[]
  - appliedMigrations: Migration[]
  - lastApplied?: Date

---

#### ✅ validateMigration()
**Açıklama:** Migration dosyasını validate et (syntax, dependencies).

**Parametre:**
- version: string

**Dönüş:** Promise<ValidationResult>

---

#### ✅ getMigrationHistory()
**Açıklama:** Migration geçmişini getir.

**Parametre:**
- limit?: number (default: 50)

**Dönüş:** Promise<MigrationHistoryEntry[]>

---

#### ✅ transformData()
**Açıklama:** Schema değiştiğinde veriyi transform et.

**Parametre:**
- fromSchema: Schema
- toSchema: Schema
- data: any[]

**Dönüş:** Promise<any[]> (transformed data)

---

### 📌 Types

```typescript
type Migration = {
  id: string
  name: string
  version: string               // timestamp
  type: 'sql' | 'data'
  status: 'pending' | 'executed' | 'reverted'
  createdAt: Date
  executedAt?: Date
  rollbackScript?: string
}

type MigrationResult = {
  version: string
  status: 'completed' | 'failed'
  duration: number              // ms
  appliedAt: Date
  error?: string
}

type MigrationStatus = {
  currentVersion: string
  pendingMigrations: Migration[]
  appliedMigrations: Migration[]
  lastApplied?: Date
}

type MigrationHistoryEntry = {
  version: string
  name: string
  appliedAt: Date
  duration: number
  direction: 'up' | 'down'
}

type Schema = {
  tables: Table[]
}

type Table = {
  name: string
  columns: Column[]
}

type Column = {
  name: string
  type: string
  nullable?: boolean
  primaryKey?: boolean
}
```

---

# 🧠 **aegis-core** - Shared Utilities

### 📌 Common Utilities

#### ✅ loadEnv()
**Açıklama:** Environment variable'larını load et (.env dosyasından).

**Parametre:**
- envFilePath?: string (default: '.env')

**Dönüş:** Record<string, string>

**Kullanım Senaryosu:**
```typescript
const env = loadEnv('.env.local')
const dbUrl = env.DATABASE_URL
```

---

#### ✅ createLogger()
**Açıklama:** Logger instance oluştur (Winston integrated).

**Parametre:**
- name: string (logger name)
- options?: LoggerOptions →
  - level?: 'debug' | 'info' | 'warn' | 'error'
  - format?: 'json' | 'pretty'

**Dönüş:**
- Logger →
  - info: (message, meta?) => void
  - error: (message, error?, meta?) => void
  - warn: (message, meta?) => void
  - debug: (message, meta?) => void

---

#### ✅ handleError()
**Açıklama:** Error'u standardize et ve log'la.

**Parametre:**
- error: Error
- context?: ErrorContext →
  - userId?: string
  - requestId?: string
  - operation?: string
  - metadata?: Record<string, any>

**Dönüş:**
- AppError →
  - code: string
  - message: string
  - statusCode: number
  - details?: Record<string, any>
  - originalError?: Error

---

#### ✅ generateId()
**Açıklama:** Unique ID generate et (UUID, nanoid, etc.).

**Parametre:**
- prefix?: string (örn: 'user_', 'order_')
- length?: number (default: 12)

**Dönüş:** string

**Kullanım Senaryosu:**
```typescript
const userId = generateId('user')      // 'user_aBc123xyz...'
const orderId = generateId('order', 16) // 'order_...'
```

---

#### ✅ delay()
**Açıklama:** Async delay (sleep).

**Parametre:**
- ms: number

**Dönüş:** Promise<void>

**Kullanım Senaryosu:**
```typescript
await delay(5000)  // 5 saniye bekle
```

---

#### ✅ retry()
**Açıklama:** Function'u retry logic'i ile çalıştır.

**Parametre:**
- fn: () => Promise<T>
- options?: RetryOptions

**Dönüş:** Promise<T>

---

#### ✅ toJSON()
**Açıklama:** Object'i JSON string'e dönüştür (circular ref. handle).

**Parametre:**
- data: any
- options?: SerializationOptions →
  - pretty?: boolean
  - maxDepth?: number

**Dönüş:** string

---

### 📌 Types

```typescript
type AppError = {
  code: string
  message: string
  statusCode: number            // HTTP status
  details?: Record<string, any>
  originalError?: Error
}

type Logger = {
  info: (message: string, meta?: any) => void
  error: (message: string, error?: Error, meta?: any) => void
  warn: (message: string, meta?: any) => void
  debug: (message: string, meta?: any) => void
}

type ErrorContext = {
  userId?: string
  requestId?: string
  operation?: string
  metadata?: Record<string, any>
}

type LoggerOptions = {
  level?: 'debug' | 'info' | 'warn' | 'error'
  format?: 'json' | 'pretty'
}

type SerializationOptions = {
  pretty?: boolean
  maxDepth?: number
}
```

---

# 🌐 GLOBAL TYPES

```typescript
// Pagination
type PaginationOptions = {
  page?: number                 // Default: 1
  pageSize?: number             // Default: 20
  sort?: string[]               // ['field:asc', 'field:desc']
}

type PaginatedResult<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// Database
type DatabaseConfig = {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl?: boolean
  poolSize?: number
}

// Redis
type RedisConfig = {
  host: string
  port: number
  password?: string
  db?: number
  keyPrefix?: string
}

// API Response
type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: ApiError
  metadata?: Record<string, any>
  timestamp: Date
}

type ApiError = {
  code: string
  message: string
  details?: Record<string, any>
  path?: string[]
}

// Timestamps
type Timestamps = {
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

// Metadata
type AuditMetadata = {
  ipAddress?: string
  userAgent?: string
  correlationId?: string
  metadata?: Record<string, any>
}

// Job
type BackoffOptions = {
  strategy: 'exponential' | 'fixed'
  delay?: number
  multiplier?: number
}

// Status
type Status = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled'
```

---

# 📋 COMPLETE PROJECT ROADMAP

## Phase 1: Foundation (Months 1-2)
- ✅ aegis-audit (complete)
- ✅ aegis-observability (complete)
- ✅ aegis-resilience (complete)
- ✅ aegis-core (complete)

## Phase 2: Utilities (Months 3-4)
- ✅ aegis-cache
- ✅ aegis-validation
- ✅ aegis-queue
- ✅ aegis-security

## Phase 3: Integration (Months 5-6)
- ✅ aegis-starter-template
- ✅ aegis-cli
- ✅ aegis-docs

## Phase 4: Advanced (Months 7-9)
- ✅ aegis-testing
- ✅ aegis-performance
- ✅ aegis-migration

## Phase 5: Hardening (Months 9+)
- Security audit
- Load testing at scale
- Production deployment
- Community feedback

---

# 🎯 Development Tips

1. **Type Safety First:** Her function'ın type'ı önceden belirle
2. **Comprehensive Testing:** %80+ code coverage hedef
3. **Documentation:** Her function için örnek yaz
4. **Monorepo Management:** Turbo kullan, build optimize et
5. **Performance:** Benchmark'ları takip et

---

