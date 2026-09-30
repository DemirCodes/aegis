# 📊 @aegis/observability

**AEGIS Framework - Distributed Tracing & Business Metrics**

> Dağıtık izleme, iş metrikleri, anomali tespiti ve sağlık durumu. Sistemde ne olduğunu anında gör.

**Bağımlılıklar:** `@aegis/core`, `@aegis/audit`, `@aegis/resilience`

---

## 📦 Kurulum

```bash
pnpm add @aegis/observability
```

---

## 🗂️ Dosya Yapısı

```
src/
├── index.ts
├── config.ts                             → initObservability, ObservabilityConfig
├── middleware/
│   ├── index.ts
│   ├── trace-correlation.middleware.ts   → traceCorrelationMiddleware
│   └── metrics.middleware.ts             → metricsMiddleware
├── metrics/
│   ├── index.ts
│   ├── business-metrics.ts               → businessMetrics (singleton)
│   ├── anomaly-detector.ts               → anomalyDetector (singleton)
│   └── metric-definitions.ts             → recordCustomMetric, recordHistogram,
│                                            recordGauge, recordCounter, getMetricValue
├── exporters/
│   ├── index.ts
│   ├── prometheus-exporter.ts            → prometheusExporter
│   └── otel-exporter.ts                  → initializeOTelExporter
├── services/
│   ├── index.ts
│   ├── observability.service.ts          → observabilityService (singleton)
│   ├── logging.service.ts                → searchLogs, getLogStats
│   ├── trace.service.ts                  → internal trace helpers (pruneOldSpans dahil)
│   └── correlation.service.ts            → internal correlation helpers
├── types/
│   ├── index.ts                          → re-export
│   ├── metrics.types.ts                  → metric ve anomali tipleri
│   ├── trace.types.ts                    → trace tipleri
│   ├── log.types.ts                      → log tipleri
│   ├── report.types.ts                   → report tipleri
│   └── prometheus.types.ts               → Prometheus tipleri
└── utils/
    ├── index.ts
    ├── anomaly-algorithms.ts             → internal (Z-Score, IQR, Seasonal, Spike)
    └── metric-helpers.ts                 → internal helpers
```

---

## 📐 Naming Convention

| Kategori | Kural | Örnek |
|----------|-------|-------|
| **Fonksiyonlar** | camelCase | `paymentProcessing()`, `getTraceDetails()` |
| **Metrik adları** | snake_case | `request_latency`, `error_rate`, `file_upload_size` |
| **Metric prefix** | `aegis_` (framework branded) | `aegis_request_latency_total` |
| **Type/Interface** | PascalCase | `TraceDetails`, `AnomalyDetectionResult` |
| **Enum değerleri** | lowercase | `'low'`, `'critical'`, `'healthy'` |
| **Env değişkenleri** | UPPER_SNAKE_CASE | `OTEL_ENABLED`, `ELASTICSEARCH_URL` |

---

## 🧩 Import Edilen Tipler

Aşağıdaki tipler **`@aegis/core`**, **`@aegis/audit`** ve **`@aegis/resilience`**'dan import edilir. `@aegis/observability` içinde **yeniden tanımlanmaz** (anayasa Kural 1: Duplikasyon YASAK).

```typescript
import {
  Logger,
  AppError,
  RetryOptions,
} from '@aegis/core';

// @aegis/audit'ten
import type { AuditLog } from '@aegis/audit';

// @aegis/resilience'dan
import type { HealthCheckResult } from '@aegis/resilience';
```

### Referans Tipler

| Tip | Kaynak | Açıklama |
|-----|--------|----------|
| `Logger` | `@aegis/core` | `{ info, error, warn, debug }` |
| `AppError` | `@aegis/core` | `class AppError extends Error` |
| `RetryOptions` | `@aegis/core` | `{ maxRetries, delay, backoffStrategy }` |
| `AuditLog` | `@aegis/audit` | Audit log entry tipi |
| `HealthCheckResult` | `@aegis/resilience` | `{ serviceName, status, responseTime, lastCheckedAt }` |

> **NOT:** Bu tipler `@aegis/observability` README'sinde sadece **referans** olarak listelenir. Tam tanımları kendi paketlerinin README'sindedir.

---

## ⚙️ Initialization & Config

### `initObservability(config?)`

**Açıklama:** Observability modülünü başlatır. Env değişkenleri default, config override eder.

**Config tipi:** `ObservabilityConfig`

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `config.serviceName` | `string` | `SERVICE_NAME` env | Servis adı |
| `config.metricPrefix` | `string` | `'aegis_'` | Prometheus metrik prefix'i |
| `config.enableOtel` | `boolean` | `OTEL_ENABLED` env | OpenTelemetry aktif |
| `config.enableElasticsearch` | `boolean` | `ELASTICSEARCH_ENABLED` env | ES aktif |
| `config.enablePrometheus` | `boolean` | `true` | Prometheus aktif |
| `config.metricBufferSize` | `number` | `1000` | Ring buffer boyutu (metric başına) |
| `config.retryCount` | `number` | `3` | Prometheus sorgu retry sayısı |

**Dönüş:** `void`

**Kullanım:**
```typescript
import { initObservability } from '@aegis/observability';

initObservability({
  serviceName: 'payment-api',
  metricPrefix: 'payment_',
  enableOtel: true,
  enableElasticsearch: true,
});
```

**Env-only kullanım:**
```bash
# .env
SERVICE_NAME=payment-api
OTEL_ENABLED=true
ELASTICSEARCH_ENABLED=true
ELASTICSEARCH_URL=http://localhost:9200
PROMETHEUS_URL=http://localhost:9090
```

### `initializeOTelExporter(config?)`

**Açıklama:** OpenTelemetry exporter'ı başlatır. Uygulama başlangıcında **bir kez** çağrılır.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `config.serviceName` | `string` | `SERVICE_NAME` env | Servis adı |
| `config.endpoint` | `string` | `OTEL_EXPORTER_OTLP_ENDPOINT` env | OTLP endpoint |

**Dönüş:** `void`

**Davranış:**
- `OTEL_ENABLED=false` ise → **no-op** (sessiz döner)
- `OTEL_ENABLED=true` ise → OTel SDK başlatır

**Kullanım:**
```typescript
import { initializeOTelExporter } from '@aegis/observability';

// Uygulama başlangıcında BİR KEZ
initializeOTelExporter({
  serviceName: 'payment-api',
  endpoint: 'http://localhost:4317',
});
```
> **NOT (Değişiklik Kaydı #3):** `otel-exporter.ts` içinde `memoryExporter` (InMemorySpanExporter) **internal export** olarak tanımlanır. `trace.service.ts` bu exporter'dan span okur. Public API'ye açılmaz.



---

## ⚙️ Initialization Davranışı

### `initObservability()` Çağrılmadan Fonksiyon Çağrılırsa?

**Davranış:** **Lazy init + Uyarı log.**

**Kural:**
- `initObservability()` çağrılmadıysa → ilk fonksiyon çağrısında **otomatik init** yapılır
- Env değişkenleri default olarak kullanılır (`SERVICE_NAME`, `OTEL_ENABLED`, vb.)
- Logger `warn` seviyesinde uyarı basar: `'initObservability() not called, using lazy init with env defaults'`

**Neden lazy init?**
- Geliştirme kolaylığı (küçük projelerde init'i unutabilirsin)
- Fail-fast geliştiricileri korkutur ve terk ettirir
- Env değişkenleri zaten default olarak yeterli

**Fail-fast örneği (YANLIŞ olurdu):**
```typescript
// ❌ Bu yaklaşım kullanılmıyor
if (!isInitialized) {
  throw new AppError('NOT_INITIALIZED', 'Call initObservability() first', 500);
}
```

**Doğru davranış:**
```typescript
// ✅ Lazy init + uyarı
if (!isInitialized) {
  logger.warn('initObservability() not called, using lazy init with env defaults');
  initObservability(); // env defaults ile
}
```

---

### `initObservability()` ve `initializeOTelExporter()` İlişkisi

**Prensip:** **Otomatik Entegrasyon** (Değişiklik Kaydı #10)

`initObservability({ enableOtel: true })` çağrıldığında, `initializeOTelExporter` **otomatik olarak** çağrılır. Kullanıcı ayrıca manuel çağırmak zorunda değildir.

| Fonksiyon | Sorumluluk |
|-----------|------------|
| `initObservability()` | Global config + logger + metric prefix ayarla |
| `initializeOTelExporter()` | OTel SDK başlat (initObservability içinden otomatik tetiklenir) |

### `initObservability({ enableOtel: true })` Ne Yapar?

- Global config'i ayarlar (`enableOtel: true` olarak işaretler)
- **OTel SDK'yı OTOMATİK BAŞLATIR** (Değişiklik Kaydı #10)
- `initializeOTelExporter()` iç çağrı ile tetiklenir

### Kullanıcı Tek Çağrı Yapar

```typescript
// ✅ DOĞRU KULLANIM (Değişiklik Kaydı #10)
import { initObservability } from '@aegis/observability';

initObservability({
  serviceName: 'payment-api',
  enableOtel: true,  // → initializeOTelExporter otomatik çağrılır
});

### Idempotent Davranış

Her iki fonksiyon da **idempotent**'tır. Aynı işlevi iki kez çağırmak zarar vermez.

**`initObservability()` ikinci çağrı:**
```typescript
initObservability(); // İlk çağrı - uygulanır
initObservability(); // İkinci çağrı - logger.warn + ignore
// Log: "initObservability() already called, ignoring duplicate call"
```

**`initializeOTelExporter()` ikinci çağrı:**
```typescript
initializeOTelExporter(); // İlk çağrı - OTel başlatılır
initializeOTelExporter(); // İkinci çağrı - logger.warn + ignore
// Log: "initializeOTelExporter() already called, ignoring duplicate call"
```

**`OTEL_ENABLED=false` durumu:**
```typescript
initializeOTelExporter(); // no-op (sessiz döner, hata YOK)
```

**Çift init YOK!** Çünkü her fonksiyon kendi flag'ini kontrol eder:
```typescript
let isInitialized = false;
let isOtelInitialized = false;

export function initObservability(config?) {
  if (isInitialized) {
    logger.warn('initObservability() already called, ignoring duplicate call');
    return;
  }
  // ... setup
  isInitialized = true;
}

export function initializeOTelExporter(config?) {
  const enabled = config?.enableOtel ?? (process.env.OTEL_ENABLED === 'true');
  if (!enabled) {
    logger.debug('OTel disabled, skipping initialization');
    return;
  }
  if (isOtelInitialized) {
    logger.warn('initializeOTelExporter() already called, ignoring duplicate call');
    return;
  }
  // ... OTel SDK setup
  isOtelInitialized = true;
}
```

### Özet Tablo

| Senaryo | Davranış |
|---------|----------|
| `OTEL_ENABLED=false` + `initializeOTelExporter()` | No-op (sessiz) |
| `initObservability({ enableOtel: true })` + `initializeOTelExporter()` | Her ikisi bağımsız çalışır, çift init YOK |
| `initObservability()` + `initObservability()` | İkinci çağrı: `warn` + ignore |
| `initializeOTelExporter()` + `initializeOTelExporter()` | İkinci çağrı: `warn` + ignore |
| `initObservability()` çağrılmadan herhangi bir fonksiyon | Lazy init + `warn` |

---

## 🚀 Hızlı Başlangıç

```typescript
import express from 'express';
import {
  initObservability,
  traceCorrelationMiddleware,
  metricsMiddleware,
  prometheusExporter,
} from '@aegis/observability';

// 1. Önce init
initObservability({ serviceName: 'my-api' });

const app = express();

// 2. Middleware
app.use(traceCorrelationMiddleware());
app.use(metricsMiddleware());

// 3. Prometheus endpoint
app.get('/metrics', prometheusExporter());
```

---

## 📌 Middleware

### `traceCorrelationMiddleware()`

**Açıklama:** Her isteğe trace-id enjekte eder. Loglara, downstream call'lara ve response header'larına ekler.

**Dönüş:** `RequestHandler` (Express middleware)

**Kullandığı Core:** `core.generateId()` → `string`

**Davranış:**
- Request'te `X-Trace-Id` header'ı varsa → kullanır
- Yoksa → `core.generateId()` ile üretir
- Response'a `X-Trace-Id` header'ı ekler

**Kullanım:**
```typescript
app.use(traceCorrelationMiddleware());
// Her request: X-Trace-Id header'ı ile gelir/gider
// Loglar otomatik trace-id içerir
```

---

### `metricsMiddleware()`

**Açıklama:** HTTP metriklerini otomatik toplar (latency, error rate, throughput).

**Dönüş:** `RequestHandler` (Express middleware)

**Topladığı metrikler:**
- `aegis_http_request_duration_seconds` (histogram)
- `aegis_http_requests_total` (counter)
- `aegis_http_errors_total` (counter)

**Kullanım:**
```typescript
app.use(metricsMiddleware());
```

---

### `prometheusExporter()`

**Açıklama:** Prometheus'un çekebileceği `/metrics` endpoint'i sağlar.

**Dönüş:** `RequestHandler` (Express middleware)

**Davranış:**
- `prom-client` registry'sindeki tüm metrikleri döner
- Content-Type: `text/plain; version=0.0.4`

**Kullanım:**
```typescript
app.get('/metrics', prometheusExporter());
// Prometheus: http://localhost:9090 burayı scrape eder
```

---

## 📌 Business Metrics

**Namespace:** `businessMetrics.*` (singleton)

> **NOT:** Metric instance'ları **singleton**'dır. Her çağrıda aynı obje döner (metric double-count önlenir). Cache `Map<string, Metrics>` ile tutulur.

### `businessMetrics.paymentProcessing()`

**Açıklama:** Ödeme işlemlerinin metriklerini track eder.

**Dönüş:** `PaymentMetrics`

**Davranış:** Singleton (her çağrıda aynı obje)

**Kullanım:**
```typescript
const metric = businessMetrics.paymentProcessing();
metric.recordLatency(1500);
metric.recordSuccess();
metric.recordError('insufficient_funds');
```

---

### `businessMetrics.apiEndpoint(endpoint, method)`

**Açıklama:** Spesifik bir API endpoint'inin metriklerini track eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `endpoint` | `string` | `/api/users` |
| `method` | `string` | `GET`, `POST`, `PUT`, `DELETE` |

**Dönüş:** `EndpointMetrics`

**Davranış:** Endpoint+method başına singleton (cache'li)

**Kullanım:**
```typescript
const metric = businessMetrics.apiEndpoint('/api/users', 'POST');
metric.recordLatency(250);
metric.recordSuccess();
```

---

### `businessMetrics.databaseOperation(operation)`

**Açıklama:** DB sorgularının latency ve row count'unu track eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `operation` | `string` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |

**Dönüş:** `DatabaseMetrics`

**Davranış:** Operation başına singleton

**Kullanım:**
```typescript
const metric = businessMetrics.databaseOperation('SELECT');
metric.recordLatency(45);
metric.recordSuccess();
```

---

### `businessMetrics.thirdPartyCall(serviceName)`

**Açıklama:** Dış API çağrılarının metriklerini track eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `serviceName` | `string` | `Stripe`, `AWS`, `SendGrid` |

**Dönüş:** `ThirdPartyMetrics`

**Davranış:** Service başına singleton

**Kullanım:**
```typescript
const metric = businessMetrics.thirdPartyCall('Stripe');
metric.recordLatency(800);
metric.recordError('timeout');
```

---

### `businessMetrics.userAction(actionType)`

**Açıklama:** Kullanıcı aksiyonlarını track eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `actionType` | `string` | `login`, `signup`, `purchase`, `logout` |

**Dönüş:** `UserMetrics`

**Davranış:** Action tipi başına singleton

**Kullanım:**
```typescript
const metric = businessMetrics.userAction('login');
metric.recordSuccess();
```

---

## 📌 Metric Definitions

**Namespace:** Direkt named export (standalone fonksiyonlar)

### `recordCustomMetric(name, value, options?)`

**Açıklama:** Serbest metrik kaydı. Label set'i cache'lenir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `name` | `string` | Metrik adı (snake_case) |
| `value` | `number` | Değer |
| `options.tags` | `Record<string, string>` | Etiketler |

**Dönüş:** `void`

**Hata Davranışı:**
- Aynı metric + **farklı label key** → `AppError('LABEL_MISMATCH', ...)`

**Kullanım:**
```typescript
// ✅ OK
recordCustomMetric('file_upload_size', 1024, { tags: { user: 'user-123' } });
recordCustomMetric('file_upload_size', 2048, { tags: { user: 'user-456' } });

// ❌ HATA (farklı label key)
recordCustomMetric('file_upload_size', 1024, { tags: { userId: 'user-123' } });
```

---

### `recordHistogram(name, value)`

**Açıklama:** Histogram metrik kaydı (latency dağılımı için).

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `name` | `string` | Metrik adı |
| `value` | `number` | Değer |

**Dönüş:** `void`

**Kullanım:**
```typescript
recordHistogram('response_time', 250);
```

---

### `recordGauge(name, value)`

**Açıklama:** Anlık değer (artıp azalan) metrik.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `name` | `string` | Metrik adı |
| `value` | `number` | Değer |

**Dönüş:** `void`

**Kullanım:**
```typescript
recordGauge('active_connections', 42);
```

---

### `recordCounter(name, increment?)`

**Açıklama:** Sayaç (sadece artan) metrik.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `name` | `string` | - | Metrik adı |
| `increment` | `number` | `1` | Artış miktarı |

**Dönüş:** `void`

**Kullanım:**
```typescript
recordCounter('total_requests');
recordCounter('total_errors', 2);
```

---

### `getMetricValue(name)`

**Açıklama:** Anlık metrik değerini okur (local buffer'dan).

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `name` | `string` | Metrik adı |

**Dönüş:** `Promise<number | null>`

**Davranış:**
- Local ring buffer'da varsa → değeri döner
- Yoksa → `null` döner (hata fırlatmaz)

**Kullanım:**
```typescript
const activeUsers = await getMetricValue('active_users');
// 42 veya null
```

---

## 📌 Anomaly Detector

**Namespace:** `anomalyDetector.*` (singleton)

### `anomalyDetector.detectZScoreAnomaly(dataPoints, threshold?)`

**Açıklama:** Z-score algoritması ile anomali tespiti.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `dataPoints` | `number[]` | - | Veri noktaları |
| `threshold` | `number` | `3` | Kaç sigma dışı anomali? |

**Dönüş:** `Promise<AnomalyDetectionResult>`

**Hata Davranışı:**
- Boş array → `{ isAnomaly: false, score: 0, ... }` (hata YOK)
- Tek elemanlı array → `{ isAnomaly: false, score: 0, ... }` (std=0)

**Kullanım:**
```typescript
const latencies = [150, 160, 155, 2000, 165];
const result = await anomalyDetector.detectZScoreAnomaly(latencies, 3);
// { isAnomaly: true, score: 8.5, severity: 'critical' }
```

---

### `anomalyDetector.detectIQRAnomaly(dataPoints, multiplier?)`

**Açıklama:** IQR (Interquartile Range) ile robust anomali tespiti.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `dataPoints` | `number[]` | - | Veri noktaları |
| `multiplier` | `number` | `1.5` | IQR çarpanı |

**Dönüş:** `Promise<AnomalyDetectionResult>`

**Hata Davranışı:**
- Boş array → `{ isAnomaly: false, score: 0 }`

**Kullanım:**
```typescript
const result = await anomalyDetector.detectIQRAnomaly(latencies, 1.5);
```

---

### `anomalyDetector.detectSeasonalAnomaly(dataPoints, period?)`

**Açıklama:** Mevsimsel/periodik anomali tespiti (Moving Average Decomposition).

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `dataPoints` | `number[]` | - | Veri noktaları |
| `period` | `number` | `24` | Periyot uzunluğu |

**Dönüş:** `Promise<AnomalyDetectionResult>`

**Algoritma:** Basit Moving Average Decomposition (STL değil)

**Adımlar:**
1. Veri noktalarını `period`'a göre grupla
2. Her grup için moving average hesapla
3. Trend = tüm veri ortalaması
4. Seasonal = grup ortalaması - trend
5. Residual = veri - trend - seasonal
6. Residual'da Z-Score uygula (threshold: 3)

**Neden STL değil?**
- STL ağır (dış bağımlılık: `stl-js` vb.)
- Basit moving average framework için yeterli
- Bağımlılık yok (pure JS)

**Hata Davranışı:**
- `dataPoints.length < period * 2` → `AppError('INSUFFICIENT_DATA', 'At least 2 periods required', 400)`
- `period <= 0` → `AppError('INVALID_PERIOD', 'Period must be > 0', 400)`

**Kullanım:**
```typescript
const hourlySales = [...]; // 7 gün × 24 saat = 168 veri noktası
const result = await anomalyDetector.detectSeasonalAnomaly(hourlySales, 24);
```

---

### `anomalyDetector.detectSpikeInMetric(metricName, threshold?)`

**Açıklama:** Metrikte ani yükselme tespiti.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `metricName` | `string` | - | Metrik adı |
| `threshold` | `number` | `200` | Yükselme eşiği (%) |

**Dönüş:** `Promise<SpikeDetectionResult>`

**Kullanım:**
```typescript
const spike = await anomalyDetector.detectSpikeInMetric('error_rate', 200);
// { hasSpike: true, increasePercentage: 900 }
```

---

### `anomalyDetector.getAnomalyScore(metricName)`

**Açıklama:** Sürekli risk skoru (0-100). Ağırlıklı ortalama formülü kullanır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `metricName` | `string` | Metrik adı |

**Dönüş:** `Promise<number>` - 0 (normal) - 100 (kritik)

**Kullandığı:** `detectZScoreAnomaly()` + `detectIQRAnomaly()`

**Formül:**
```
score = (zScore_normalized * 0.6) + (iqrScore_normalized * 0.4)
```

**Normalizasyon:**
- `zScore_normalized` = `min(100, abs(zScore) * 20)`
- `iqrScore_normalized` = `min(100, abs(iqrScore) * 25)`

**Ağırlıklar:**
- Z-Score: %60
- IQR: %40

**Severity Mapping:**
| Score | Severity |
|-------|----------|
| 0-25 | `low` |
| 26-50 | `medium` |
| 51-75 | `high` |
| 76-100 | `critical` |

**Hata Davranışı:**
- Metrik bulunamazsa → `0` döner

**Kullanım:**
```typescript
const score = await anomalyDetector.getAnomalyScore('error_rate');
// 75
```

---

### `anomalyDetector.getAnomalyHistory(metricName?, limit?)`

**Açıklama:** Geçmiş anomali kayıtlarını getirir.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `metricName` | `string` | - | Metrik filtresi |
| `limit` | `number` | `100` | Max kayıt |

**Dönüş:** `Promise<AnomalyEvent[]>`

**Kullanım:**
```typescript
const history = await anomalyDetector.getAnomalyHistory('error_rate', 50);
```

---

### `anomalyDetector.setAnomalyAlert(rule)`

**Açıklama:** Otomatik anomali alert'i kurar. **Callback pattern** kullanır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `rule.metricName` | `string` | Metrik adı |
| `rule.threshold` | `number` | Eşik |
| `rule.action.type` | `'email' \| 'slack' \| 'webhook'` | Alert tipi |
| `rule.action.config` | `Record<string, any>` | Alert yapılandırması |
| `rule.action.handler` | `(alert: AnomalyEvent) => Promise<void>` | **Kullanıcı sağlar** (opsiyonel) |

**Dönüş:** `Promise<string>` - Alert ID

**Davranış:**
- `handler` varsa → anomali tetiklendiğinde çağrılır
- `handler` yoksa → sadece log'a yazar (`logger.warn`)

**Kullanım:**
```typescript
const alertId = await anomalyDetector.setAnomalyAlert({
  metricName: 'error_rate',
  threshold: 50,
  action: {
    type: 'slack',
    config: { webhook: 'https://hooks.slack.com/...' },
    handler: async (alert) => {
      await fetch(alert.action.config.webhook, {
        method: 'POST',
        body: JSON.stringify(alert),
      });
    },
  },
});
```

---

## 📌 Observability Service

**Namespace:** `observabilityService.*` (singleton)

> **NOT:** `correlateTraceWithLogs` **sadece** `observabilityService` üzerinden erişilir. Standalone export YOK.

### `observabilityService.getTraceDetails(traceId)`

**Açıklama:** Trace'in tüm span'larını getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `traceId` | `string` | Trace ID |

**Dönüş:** `Promise<TraceDetails>`

**Hata Davranışı:**
- Trace yoksa → `AppError('TRACE_NOT_FOUND', ...)`

**Kullanım:**
```typescript
const trace = await observabilityService.getTraceDetails('trace-abc');
// { spans: [...], duration: 2450, status: 'success' }
```

---

### `observabilityService.getTraceTree(traceId)`

**Açıklama:** Trace'i hiyerarşik ağaç olarak döndürür.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `traceId` | `string` | Trace ID |

**Dönüş:** `Promise<TraceTree>`

**Kullandığı:** `getTraceDetails()` (veriyi ağaca çevirir)

**Kullanım:**
```typescript
const tree = await observabilityService.getTraceTree('trace-abc');
// { rootSpan: {...}, children: [{...}, {...}] }
```

---

### `observabilityService.getSlowTraces(threshold?, limit?)`

**Açıklama:** Belirli süreden yavaş trace'leri listeler.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `threshold` | `number` | `1000` | Eşik (ms) |
| `limit` | `number` | `100` | Max kayıt |

**Dönüş:** `Promise<SlowTrace[]>`

**Kullanım:**
```typescript
const slowTraces = await observabilityService.getSlowTraces(500, 20);
// [{ traceId: 'trace-1', duration: 2450 }, ...]
```

---

### `observabilityService.getFailedTraces(limit?)`

**Açıklama:** Başarısız trace'leri listeler.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `limit` | `number` | `100` | Max kayıt |

**Dönüş:** `Promise<FailedTrace[]>`

**Kullanım:**
```typescript
const failed = await observabilityService.getFailedTraces(50);
```

---

### `observabilityService.correlateTraceWithLogs(traceId)`

**Açıklama:** Trace + log + audit korelasyonu.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `traceId` | `string` | Trace ID |

**Dönüş:** `Promise<CorrelatedData>`

**Kullandığı:**
- `audit.getAuditLogByCorrelationId(traceId)` → `Promise<AuditLog[]>`

**Kullanım:**
```typescript
const correlated = await observabilityService.correlateTraceWithLogs('trace-error-123');
// { spans: [...], logs: [...], auditLogs: [...] }
```

---

### `observabilityService.generatePerformanceReport(startDate, endDate)`

**Açıklama:** Sistem performans raporu oluşturur.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `startDate` | `Date` | Başlangıç |
| `endDate` | `Date` | Bitiş |

**Dönüş:** `Promise<PerformanceReport>`

**Veri Kaynakları:**
- Latency/error/throughput → Prometheus HTTP API
- Trace detayları → OTel in-memory store

**Kullanım:**
```typescript
const report = await observabilityService.generatePerformanceReport(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
// { avgLatency: 245, p95Latency: 480, errorRate: 0.5 }
```

---

### `observabilityService.getServiceHealthStatus()`

**Açıklama:** Birleşik sağlık durumu. Kendi metrik verisi + resilience health check'lerini birleştirir.

**Dönüş:** `Promise<HealthStatus>`

**Kullandığı:**
- `resilience.getAllHealthStatus()` → `Promise<Record<string, HealthCheckResult>>`

**Kullanım:**
```typescript
const health = await observabilityService.getServiceHealthStatus();
// { status: 'healthy', errorRate: 0.1, uptime: 99.9 }
```

---

### `observabilityService.getErrorRateByEndpoint(options?)`

**Açıklama:** Endpoint bazlı hata oranlarını getirir.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `options.timeWindow` | `'hour' \| 'day' \| 'week'` | `'hour'` | Zaman aralığı |
| `options.threshold` | `number` | `0` | Sadece bu eşiği aşanlar |

**Dönüş:** `Promise<ErrorRateMetrics[]>`

**Kullanım:**
```typescript
const errorRates = await observabilityService.getErrorRateByEndpoint({ threshold: 1 });
// [{ endpoint: '/api/users', errorRate: 2.5 }, ...]
```

---

### `observabilityService.getLatencyPercentiles(endpoint)`

**Açıklama:** Endpoint'in latency percentile'larını getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `endpoint` | `string` | Endpoint yolu |

**Dönüş:** `Promise<LatencyPercentiles>`

**Kullanım:**
```typescript
const percentiles = await observabilityService.getLatencyPercentiles('/api/users');
// { p50: 150, p95: 480, p99: 850, max: 1200 }
```

---

### `observabilityService.customMetricQuery(promql)`

**Açıklama:** Serbest PromQL sorgusu gönderir (Prometheus HTTP API).

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `promql` | `string` | PromQL ifadesi |

**Dönüş:** `Promise<MetricResult>`

**Kullandığı:**
- `core.retry()` → `Promise<T>` (Prometheus sorgu retry)
- `PROMETHEUS_URL` env

**Hata Davranışı:**
- `PROMETHEUS_URL` yoksa → `AppError('PROMETHEUS_NOT_CONFIGURED', ...)`

**Kullanım:**
```typescript
const result = await observabilityService.customMetricQuery(
  'rate(http_requests_total[5m])'
);
```

---

### `observabilityService.getSystemOverview()`

**Açıklama:** Tüm sistemin özetini döndürür.

**Dönüş:** `Promise<SystemOverview>`

**Kullandığı:**
- `getServiceHealthStatus()`
- `getErrorRateByEndpoint()`
- `getLatencyPercentiles()`

**Kullanım:**
```typescript
const overview = await observabilityService.getSystemOverview();
// { totalServices: 5, healthyServices: 4, avgLatency: 200, errorRate: 0.3 }
```

---

### `observabilityService.getDependencyGraph()`

**Açıklama:** Servis bağımlılık grafiğini oluşturur (OTel span parent-child ilişkilerinden).

**Dönüş:** `Promise<DependencyGraph>`

**Kullanım:**
```typescript
const graph = await observabilityService.getDependencyGraph();
// { nodes: [...], edges: [{ from: 'api', to: 'db', callCount: 5000 }] }
```

> **NOT (Değişiklik Kaydı #11):** `getTraceDetails`, `getSlowTraces`, `getFailedTraces`, `getDependencyGraph` fonksiyonları her çağrıda önce `pruneOldSpans()` çalıştırır (OOM koruması). Bu internal bir davranıştır, kullanıcı müdahalesi gerekmez.

---

## 📌 Logging

**Namespace:** Direkt named export

### `searchLogs(query, options?)`

**Açıklama:** Elasticsearch'te log arama yapar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `query` | `string` | Arama terimi |
| `options.level` | `'debug' \| 'info' \| 'warn' \| 'error'` | Log seviyesi filtresi |
| `options.service` | `string` | Servis filtresi |
| `options.startDate` | `Date` | Başlangıç |
| `options.endDate` | `Date` | Bitiş |
| `options.limit` | `number` | Max kayıt (default: 100) |

**Dönüş:** `Promise<LogSearchResult>`

**Hata Davranışı:**
- `ELASTICSEARCH_ENABLED=false` → **Uyarı log + boş sonuç döner**
  ```typescript
  { total: 0, logs: [], took: 0 }
  ```

**Kullanım:**
```typescript
const logs = await searchLogs('timeout', {
  level: 'error',
  service: 'payment-service',
  limit: 50
});
// { total: 23, logs: [...], took: 12 }
```

---

### `getLogStats(filters?)`

**Açıklama:** Log istatistiklerini getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `filters.startDate` | `Date` | Başlangıç |
| `filters.endDate` | `Date` | Bitiş |
| `filters.service` | `string` | Servis filtresi |

**Dönüş:** `Promise<LogStats>`

**Hata Davranışı:**
- `ELASTICSEARCH_ENABLED=false` → **Uyarı log + boş sonuç döner**
  ```typescript
  { totalLogs: 0, byLevel: {}, byService: {}, errorRate: 0 }
  ```

**Kullanım:**
```typescript
const stats = await getLogStats({ service: 'api' });
// { totalLogs: 125000, byLevel: { error: 500, warn: 2000, info: 100000 }, errorRate: 0.4 }
```

---

## 📖 Type Definitions

### Enum Types

```typescript
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export type HealthStatusLevel = 'healthy' | 'degraded' | 'unhealthy';

export type TimeWindow = 'hour' | 'day' | 'week';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type AlertActionType = 'email' | 'slack' | 'webhook';
```

### Anomaly Types

```typescript
export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  score: number;
  threshold: number;
  severity: AnomalySeverity;
  timestamp: Date;
}

export interface SpikeDetectionResult {
  hasSpike: boolean;
  baselineValue: number;
  peakValue: number;
  increasePercentage: number;
  detectedAt: Date;
}

export interface AnomalyEvent {
  id: string;
  metricName: string;
  result: AnomalyDetectionResult;
  detectedAt: Date;
}

export interface AlertAction {
  type: AlertActionType;
  config: Record<string, any>;
  handler?: (alert: AnomalyEvent) => Promise<void>;
}

export interface AlertRule {
  metricName: string;
  threshold: number;
  action: AlertAction;
}
```

### Business Metric Types

```typescript
export interface PaymentMetrics {
  recordLatency(ms: number): void;
  recordSuccess(): void;
  recordError(errorType: string): void;
}

export interface EndpointMetrics {
  recordLatency(ms: number): void;
  recordSuccess(): void;
  recordError(): void;
}

export interface DatabaseMetrics {
  recordLatency(ms: number): void;
  recordSuccess(): void;
  recordError(): void;
}

export interface ThirdPartyMetrics {
  recordLatency(ms: number): void;
  recordSuccess(): void;
  recordError(errorType: string): void;
}

export interface UserMetrics {
  recordSuccess(): void;
  recordError(): void;
}
```

### Trace Types

```typescript
export interface Span {
  spanId: string;
  traceId: string;
  parentSpanId?: string;   // Değişiklik Kaydı #2
  operationName: string;
  duration: number;
  status: 'ok' | 'error';
  tags: Record<string, any>;
  logs: SpanLog[];
  startTime: Date;
  endTime: Date;
}

export interface SpanLog {
  timestamp: Date;
  fields: Record<string, any>;
}

export interface ServiceCall {
  serviceName: string;
  operationName: string;
  duration: number;
  status: 'ok' | 'error';
}

export interface TraceDetails {
  traceId: string;
  spans: Span[];
  duration: number;
  status: 'success' | 'error';
  serviceCalls: ServiceCall[];
  timestamp: Date;
}

export interface TraceTree {
  traceId: string;
  rootSpan: Span;
  children: TraceTree[];
}

export interface SlowTrace {
  traceId: string;
  duration: number;
  operationName: string;
  timestamp: Date;
}

export interface FailedTrace {
  traceId: string;
  error: string;
  duration: number;
  timestamp: Date;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  traceId?: string;
  service?: string;
  [key: string]: any;
}

export interface CorrelatedData {
  traceId: string;
  spans: Span[];
  logs: LogEntry[];
  correlatedEvents: Array<{
    span: Span;
    logs: LogEntry[];
  }>;
}

export interface DependencyGraph {
  nodes: Array<{ serviceName: string; type: 'service' | 'database' | 'external' }>;
  edges: Array<{ from: string; to: string; callCount: number }>;
}
```

### Report Types

```typescript
export interface PerformanceReport {
  period: { start: Date; end: Date };
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  throughput: number;
  topSlowEndpoints: EndpointMetric[];
  topErrorEndpoints: EndpointMetric[];
}

export interface EndpointMetric {
  endpoint: string;
  method: string;
  avgLatency?: number;
  errorRate?: number;
  throughput?: number;
}

export interface LatencyPercentiles {
  endpoint: string;
  p50: number;
  p75: number;
  p95: number;
  p99: number;
  max: number;
}

export interface ErrorRateMetrics {
  endpoint: string;
  method: string;
  errorRate: number;
  errorCount: number;
  totalRequests: number;
}

export interface HealthStatus {
  status: HealthStatusLevel;
  uptime: number;
  errorRate: number;
  lastCheck: Date;
}

export interface SystemOverview {
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  unhealthyServices: number;
  totalRequests: number;
  avgLatency: number;
  errorRate: number;
  timestamp: Date;
}
```

### Log Types

```typescript
export interface LogSearchResult {
  total: number;
  logs: LogEntry[];
  took: number;
}

export interface LogStats {
  totalLogs: number;
  byLevel: Record<string, number>;
  byService: Record<string, number>;
  errorRate: number;
}
```

### Prometheus Types

```typescript
export interface PrometheusQuery {
  expression: string;
  start: Date;
  end: Date;
  step?: string;
}

export interface MetricResult {
  metric: Record<string, string>;
  value: number[];
  timestamps: Date[];
}
```

---

## 📊 Config Values & Defaults

| Değer | Default | Açıklama |
|-------|---------|----------|
| `METRIC_BUFFER_SIZE` | `1000` | Ring buffer boyutu (metric başına) |
| `OTEL_ENABLED` | `false` | OpenTelemetry aktif |
| `ELASTICSEARCH_ENABLED` | `false` | ES aktif |
| `PROMETHEUS_URL` | - | Prometheus HTTP API |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | - | OTLP endpoint |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | ES URL |
| `ELASTICSEARCH_INDEX_PREFIX` | `aegis-logs` | ES index prefix |
| `metricPrefix` | `aegis_` | Prometheus metrik prefix'i |
| `retryCount` | `3` | Prometheus sorgu retry |
| `retryDelay` | `1000` | Retry base delay (ms) |

---

## 🧪 Test Stratejisi

### Test Kapsamı
- **%80+ line coverage** hedefi
- Pure fonksiyonlar (anomaly-algorithms) → unit test
- Servisler (observabilityService) → integration test
- Middleware → integration test

### Mock Stratejisi

| Bağımlılık | Yöntem |
|-----------|--------|
| **OpenTelemetry** | In-memory mock exporter |
| **Prometheus** | prom-client kendi registry'si |
| **Elasticsearch** | `jest.mock('@elastic/elasticsearch')` + fixtures |
| **Audit** | `jest.mock('@aegis/audit')` |
| **Resilience** | `jest.mock('@aegis/resilience')` |

### Örnek Test Yapısı
```
tests/
├── unit/
│   ├── anomaly-algorithms.test.ts
│   ├── metric-helpers.test.ts
│   └── metric-definitions.test.ts
├── integration/
│   ├── middleware.test.ts
│   ├── observability.service.test.ts
│   └── logging.service.test.ts
└── fixtures/
    ├── traces.fixture.ts
    ├── metrics.fixture.ts
    └── logs.fixture.ts
```

---

## 📋 Version Policy

- **Semver:** `MAJOR.MINOR.PATCH`
- **MAJOR:** Breaking change
- **MINOR:** Yeni özellik (geriye uyumlu)
- **PATCH:** Bug fix

**Breaking change örnekleri:**
- Fonksiyon imzası değişikliği
- Type değişikliği (required → optional ters çevirme)
- Default değer değişikliği
- Env değişkeni ismi değişikliği

---

## 🔗 Delegasyon Özeti

| Kullandığı | Fonksiyon | İmza |
|-----------|-----------|------|
| `core` | `createLogger(name)` | `(name: string) => Logger` |
| `core` | `AppError` | `(code, message, statusCode, details?) => AppError` |
| `core` | `generateId(prefix?)` | `(prefix?: string) => string` |
| `core` | `retry(fn, options?)` | `(fn: () => Promise<T>, options?: RetryOptions) => Promise<T>` |
| `audit` | `getAuditLogByCorrelationId(id)` | `(correlationId: string) => Promise<AuditLog[]>` |
| `resilience` | `getAllHealthStatus()` | `() => Promise<Record<string, HealthCheckResult>>` |

---

## 📚 İmza Referansları

### Core'dan Gelen

```typescript
// Logger
export interface Logger {
  info: (message: string, meta?: any) => void;
  error: (message: string, error?: Error, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
}

// AppError
export class AppError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, any>;
  constructor(
    code: string,
    message: string,
    statusCode: number,
    details?: Record<string, any>
  );
}

// RetryOptions
export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoffStrategy?: 'exponential' | 'linear' | 'none';
  jitter?: boolean;
}

// Fonksiyonlar
export function createLogger(name: string, options?: LoggerOptions): Logger;
export function generateId(prefix?: string, length?: number): string;
export function retry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
```

### Audit'ten Gelen

```typescript
export interface AuditLog {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  changes: Record<string, { old: any; new: any }>;
  metadata?: AuditMetadata;
  timestamp: Date;
  status: 'completed' | 'failed';
}
```

### Resilience'dan Gelen

```typescript
export interface HealthCheckResult {
  serviceName: string;
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  lastCheckedAt: Date;
  consecutiveFailures?: number;
  error?: string;
}
```

---


---

## 📝 Değişiklik Kayıtları

Aşağıdaki değişiklikler orijinal README'ye göre yapılmıştır. Her biri gerekçesiyle birlikte listelenmiştir.

| # | Dosya | Değişiklik | Gerekçe |
|---|-------|-----------|---------|
| 1 | `types/report.types.ts`, `types/prometheus.types.ts` | Yeni dosyalar eklendi | README'de Report Types ve Prometheus Types başlıkları vardı ama dosya yoktu |
| 2 | `types/trace.types.ts` | `Span.parentSpanId?: string` eklendi | `buildTraceTree` ve `getDependencyGraph` parent-child ilişkisi için gerekli |
| 3 | `exporters/otel-exporter.ts` | `memoryExporter` export edildi | `trace.service.ts`'in OTel in-memory store'a erişmesi için |
| 4 | `services/trace.service.ts` | `pruneOldSpans` fonksiyonu eklendi | `InMemorySpanExporter` sınırsız büyür → OOM koruması |
| 5 | `services/observability.service.ts` | `@aegis/resilience` geçici mock | Paket henüz yazılmadı → TODO olarak işaretlendi |
| 6 | `services/observability.service.ts` | `getDependencyGraph` → `DependencyGraph` tipi | README'de tanımlı, kullanılmalı |
| 7 | `services/observability.service.ts` | `promQuery` → `PrometheusQuery` tipi | README'de tanımlı, kullanılmalı |
| 8 | `src/config.ts` | Yeni dosya eklendi | `initObservability` fonksiyonu için konum belirsizdi |
| 9 | `src/config.ts` | `ObservabilityConfig` interface eklendi | README'de tip adı yoktu, parametreler vardı |
| 10 | `src/config.ts` | `initializeOTelExporter` otomatik çağrı | Kural 10: Güvenli + Kullanışlı (kullanıcı unutma riski yok) |
| 11 | `services/trace.service.ts` + `observability.service.ts` | `pruneOldSpans()` 4 yerde çağrılıyor | OOM koruması, otomatik bellek yönetimi |

### Geçici Notlar

- **Değişiklik #5:** `@aegis/resilience` paketi yazıldığında `getServiceHealthStatus` fonksiyonu gerçek `getAllHealthStatus()` entegrasyonu ile güncellenecektir.
- **Değişiklik #10:** `initializeOTelExporter` hâlâ public API'de mevcuttur; `enableOtel: true` ile otomatik çağrılır. Bu, "Ayrı Sorumluluk" prensibinden sapmadır ve bilinçli bir tasarım kararıdır (Kural 10).


---
## 📄 Lisans

MIT



