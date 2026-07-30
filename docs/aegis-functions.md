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

**Bu specification, kodlamaya başlamadan önce complete reference olarak kullan.** 📖💪