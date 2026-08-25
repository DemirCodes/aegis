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

## 🚀 Hızlı Başlangıç

```typescript
import express from 'express';
import {
  traceCorrelationMiddleware,
  metricsMiddleware,
  prometheusExporter,
} from '@aegis/observability';

const app = express();

// Trace ID otomatik enjeksiyonu
app.use(traceCorrelationMiddleware());

// HTTP metrikleri toplama
app.use(metricsMiddleware());

// Prometheus /metrics endpoint
app.get('/metrics', prometheusExporter());
```

---

## 📌 Middleware

### `traceCorrelationMiddleware()`

**Açıklama:** Her isteğe trace-id enjekte eder. Loglara, downstream call'lara ve response header'larına ekler.

**Dönüş:** Express middleware

**Kullandığı Core:** `core.generateId()`

**Kullanım:**
```typescript
app.use(traceCorrelationMiddleware());
// Her request: X-Trace-Id header'ı ile gelir/gider
// Loglar otomatik trace-id içerir
```

---

### `metricsMiddleware()`

**Açıklama:** HTTP metriklerini otomatik toplar (latency, error rate, throughput).

**Dönüş:** Express middleware

**Kullanım:**
```typescript
app.use(metricsMiddleware());
// Her endpoint için: request_latency, request_count, error_rate
```

---

### `prometheusExporter()`

**Açıklama:** Prometheus'un çekebileceği `/metrics` endpoint'i sağlar.

**Dönüş:** Express middleware

**Kullanım:**
```typescript
app.get('/metrics', prometheusExporter());
// Prometheus: http://localhost:9090 burayı scrape eder
```

---

## 📌 Business Metrics

### `paymentProcessing()`

**Açıklama:** Ödeme işlemlerinin metriklerini track eder.

**Dönüş:** `PaymentMetrics` object

**Kullanım:**
```typescript
const metric = businessMetrics.paymentProcessing();

metric.recordLatency(1500);        // 1.5 saniye
metric.recordSuccess();            // Başarılı ödeme
metric.recordError('insufficient_funds');  // Hata tipi ile
```

---

### `apiEndpoint(endpoint, method)`

**Açıklama:** Spesifik bir API endpoint'inin metriklerini track eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `endpoint` | `string` | `/api/users` |
| `method` | `string` | `GET`, `POST`, `PUT`, `DELETE` |

**Dönüş:** `EndpointMetrics` object

**Kullanım:**
```typescript
const metric = businessMetrics.apiEndpoint('/api/users', 'POST');

metric.recordLatency(250);   // 250ms
metric.recordSuccess();
```

---

### `databaseOperation(operation)`

**Açıklama:** DB sorgularının latency ve row count'unu track eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `operation` | `string` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |

**Dönüş:** `DatabaseMetrics` object

**Kullanım:**
```typescript
const metric = businessMetrics.databaseOperation('SELECT');
metric.recordLatency(45);
metric.recordSuccess();
```

---

### `thirdPartyCall(serviceName)`

**Açıklama:** Dış API çağrılarının (Stripe, AWS, SendGrid) metriklerini track eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `serviceName` | `string` | `Stripe`, `AWS`, `SendGrid` |

**Dönüş:** `ThirdPartyMetrics` object

**Kullanım:**
```typescript
const metric = businessMetrics.thirdPartyCall('Stripe');
metric.recordLatency(800);
metric.recordError('timeout');
```

---

### `userAction(actionType)`

**Açıklama:** Kullanıcı aksiyonlarını (login, signup, purchase) track eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `actionType` | `string` | `login`, `signup`, `purchase`, `logout` |

**Dönüş:** `UserMetrics` object

**Kullanım:**
```typescript
const metric = businessMetrics.userAction('login');
metric.recordSuccess();
```

---

### `recordCustomMetric(name, value, options?)`

**Açıklama:** Serbest metrik kaydı.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `name` | `string` | Metrik adı |
| `value` | `number` | Değer |
| `options.tags` | `Record<string, string>` | Etiketler |

**Kullanım:**
```typescript
recordCustomMetric('file_upload_size', 1024, { tags: { user: 'user-123' } });
```

---

### `recordHistogram(name, value)`

**Açıklama:** Histogram metrik kaydı (latency dağılımı için).

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `name` | `string` | Metrik adı |
| `value` | `number` | Değer |

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

**Kullanım:**
```typescript
recordCounter('total_requests');
recordCounter('total_errors', 2);
```

---

### `getMetricValue(name)`

**Açıklama:** Anlık metrik değerini okur.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `name` | `string` | Metrik adı |

**Dönüş:** `Promise<number | null>`

**Kullandığı:** `customMetricQuery()` (basitleştirilmiş)

**Kullanım:**
```typescript
const activeUsers = await getMetricValue('active_users');
// 42
```

---

## 📌 Anomaly Detector

### `detectZScoreAnomaly(dataPoints, threshold?)`

**Açıklama:** Z-score algoritması ile anomali tespiti.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `dataPoints` | `number[]` | - | Veri noktaları |
| `threshold` | `number` | `3` | Kaç sigma dışı anomali? |

**Dönüş:** `Promise<AnomalyDetectionResult>`

**Kullanım:**
```typescript
const latencies = [150, 160, 155, 2000, 165]; // 2000 anomali
const result = await anomalyDetector.detectZScoreAnomaly(latencies, 3);
// { isAnomaly: true, severity: 'critical' }
```

---

### `detectIQRAnomaly(dataPoints, multiplier?)`

**Açıklama:** IQR (Interquartile Range) ile robust anomali tespiti.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `dataPoints` | `number[]` | - | Veri noktaları |
| `multiplier` | `number` | `1.5` | IQR çarpanı |

**Dönüş:** `Promise<AnomalyDetectionResult>`

**Kullanım:**
```typescript
const result = await anomalyDetector.detectIQRAnomaly(latencies, 1.5);
```

---

### `detectSeasonalAnomaly(dataPoints, period?)`

**Açıklama:** Mevsimsel/periodik anomali tespiti.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `dataPoints` | `number[]` | Veri noktaları |
| `period` | `number` | Periyot uzunluğu (örn: 24 saat) |

**Dönüş:** `Promise<AnomalyDetectionResult>`

**Kullanım:**
```typescript
const hourlySales = [...]; // 7 günlük saatlik veri
const result = await anomalyDetector.detectSeasonalAnomaly(hourlySales, 24);
```

---

### `detectSpikeInMetric(metricName, threshold?)`

**Açıklama:** Prometheus metriğinde ani yükselme tespiti.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `metricName` | `string` | Metrik adı (`error_rate`) |
| `threshold` | `number` | Yükselme eşiği (%) |

**Dönüş:** `Promise<SpikeDetectionResult>`

**Kullanım:**
```typescript
const spike = await anomalyDetector.detectSpikeInMetric('error_rate', 200);
// { hasSpike: true, increasePercentage: 900 }
```

---

### `getAnomalyScore(metricName)`

**Açıklama:** Sürekli risk skoru (0-100).

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `metricName` | `string` | Metrik adı |

**Dönüş:** `Promise<number>` - 0 (normal) - 100 (kritik)

**Kullandığı:** `detectZScoreAnomaly()` + `detectIQRAnomaly()`

**Kullanım:**
```typescript
const score = await anomalyDetector.getAnomalyScore('error_rate');
// 75 → high risk
```

---

### `getAnomalyHistory(metricName?, limit?)`

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

### `setAnomalyAlert(rule)`

**Açıklama:** Otomatik anomali alert'i kurar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `rule.metricName` | `string` | Metrik adı |
| `rule.threshold` | `number` | Eşik |
| `rule.action.type` | `'email' \| 'slack' \| 'webhook'` | Alert tipi |
| `rule.action.config` | `Record<string, any>` | Alert yapılandırması |

**Dönüş:** `Promise<string>` - Alert ID

**Kullanım:**
```typescript
const alertId = await anomalyDetector.setAnomalyAlert({
  metricName: 'error_rate',
  threshold: 50,
  action: { type: 'slack', config: { webhook: 'https://hooks.slack.com/...' } }
});
```

---

## 📌 Observability Service

### `getTraceDetails(traceId)`

**Açıklama:** Trace'in tüm span'larını getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `traceId` | `string` | Trace ID |

**Dönüş:** `Promise<TraceDetails>`

**Kullanım:**
```typescript
const trace = await observabilityService.getTraceDetails('trace-abc');
// { spans: [...], duration: 2450, status: 'success' }
```

---

### `getTraceTree(traceId)`

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

### `getSlowTraces(threshold?, limit?)`

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

### `getFailedTraces(limit?)`

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

### `correlateTraceWithLogs(traceId)`

**Açıklama:** Trace + log + audit korelasyonu.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `traceId` | `string` | Trace ID |

**Dönüş:** `Promise<CorrelatedData>`

**Kullandığı:** `audit.getAuditLogByCorrelationId()`

**Kullanım:**
```typescript
const correlated = await observabilityService.correlateTraceWithLogs('trace-error-123');
// { spans: [...], logs: [...], auditLogs: [...] }
```

---

### `generatePerformanceReport(startDate, endDate)`

**Açıklama:** Sistem performans raporu oluşturur.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `startDate` | `Date` | Başlangıç |
| `endDate` | `Date` | Bitiş |

**Dönüş:** `Promise<PerformanceReport>`

**Kullanım:**
```typescript
const report = await observabilityService.generatePerformanceReport(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
// { avgLatency: 245, p95Latency: 480, errorRate: 0.5 }
```

---

### `getServiceHealthStatus()`

**Açıklama:** Birleşik sağlık durumu. Kendi metrik verisi + resilience health check'lerini birleştirir.

**Dönüş:** `Promise<HealthStatus>`

**Kullandığı:** `resilience.getAllHealthStatus()`

**Kullanım:**
```typescript
const health = await observabilityService.getServiceHealthStatus();
// { status: 'healthy', errorRate: 0.1, uptime: 99.9 }
```

---

### `getErrorRateByEndpoint(options?)`

**Açıklama:** Endpoint bazlı hata oranlarını getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `options.timeWindow` | `'hour' \| 'day' \| 'week'` | Zaman aralığı |
| `options.threshold` | `number` | Sadece bu eşiği aşanlar |

**Dönüş:** `Promise<ErrorRateMetrics[]>`

**Kullanım:**
```typescript
const errorRates = await observabilityService.getErrorRateByEndpoint({ threshold: 1 });
// [{ endpoint: '/api/users', errorRate: 2.5 }, ...]
```

---

### `getLatencyPercentiles(endpoint)`

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

### `customMetricQuery(promql)`

**Açıklama:** Serbest PromQL sorgusu gönderir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `promql` | `string` | PromQL ifadesi |

**Dönüş:** `Promise<MetricResult>`

**Kullandığı Core:** `core.retry()` (resilience)

**Kullanım:**
```typescript
const result = await observabilityService.customMetricQuery(
  'rate(http_requests_total[5m])'
);
```

---

### `getSystemOverview()`

**Açıklama:** Tüm sistemin özetini döndürür.

**Dönüş:** `Promise<SystemOverview>`

**Kullandığı:** `getServiceHealthStatus()`, `getErrorRateByEndpoint()`, `getLatencyPercentiles()`

**Kullanım:**
```typescript
const overview = await observabilityService.getSystemOverview();
// { totalServices: 5, healthyServices: 4, avgLatency: 200, errorRate: 0.3 }
```

---

### `getDependencyGraph()`

**Açıklama:** Servis bağımlılık grafiğini oluşturur.

**Dönüş:** `Promise<DependencyGraph>`

**Kullanım:**
```typescript
const graph = await observabilityService.getDependencyGraph();
// { nodes: [...], edges: [{ from: 'api', to: 'db', callCount: 5000 }] }
```

---

## 📌 Logging

### `searchLogs(query, options?)`

**Açıklama:** Elasticsearch'te log arama yapar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `query` | `string` | Arama terimi |
| `options.level` | `string` | Log seviyesi filtresi |
| `options.service` | `string` | Servis filtresi |
| `options.startDate` | `Date` | Başlangıç |
| `options.endDate` | `Date` | Bitiş |
| `options.limit` | `number` | Max kayıt |

**Dönüş:** `Promise<LogSearchResult>`

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

**Kullanım:**
```typescript
const stats = await getLogStats({ service: 'api' });
// { totalLogs: 125000, byLevel: { error: 500, warn: 2000, info: 100000 }, errorRate: 0.4 }
```

---

## 🔗 Delegasyon Özeti

| Kullandığı | Fonksiyon | Amaç |
|-----------|-----------|------|
| `core` | `createLogger()` | Logging |
| `core` | `AppError` | Hata yönetimi |
| `core` | `generateId()` | Trace ID üretimi |
| `core` | `retry()` | Prometheus sorgu retry |
| `audit` | `getAuditLogByCorrelationId()` | Log-trace korelasyonu |
| `resilience` | `getAllHealthStatus()` | Servis sağlık kontrolü |

---

## 📄 Lisans

MIT