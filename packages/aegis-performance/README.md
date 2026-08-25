# ⚙️ @aegis/performance

**AEGIS Framework - Profilers & Load Testing**

> Yavaş olan neresi? Profiling, load test, regression tespiti. Observability'den okur, kendi metrik toplamaz.

**Bağımlılıklar:** `@aegis/core`, `@aegis/observability`

---

## 📦 Kurulum

```bash
pnpm add @aegis/performance
```

---

## 🚀 Hızlı Başlangıç

```typescript
import {
  profileDbQuery,
  loadTest,
  detectPerformanceRegression,
} from '@aegis/performance';

// Sorgu profille
const profile = await profileDbQuery('SELECT * FROM users WHERE email = ?');

// Yük testi
const result = await loadTest('http://localhost:3000/api/users', {
  concurrency: 100,
  duration: 60,
});

// Regression tespiti
const regression = await detectPerformanceRegression(baselineData, currentData);
```

---

## 📌 Fonksiyonlar

### `profileDbQuery(query, options?)`

**Açıklama:** Sorgu performansını ölçer.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `query` | `string` | SQL sorgusu |
| `options.iterations` | `number` | Ölçüm tekrarı |
| `options.timeout` | `number` | Zaman aşımı |

**Dönüş:** `Promise<QueryProfile>`

**Kullanım:**
```typescript
const profile = await profileDbQuery('SELECT * FROM users WHERE email = ?');
// { executionTime: 45, rowsAffected: 1, slowQuery: false }
```

---

### `profileEndpoint(endpoint, options?)`

**Açıklama:** Endpoint latency profili çıkarır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `endpoint` | `string` | URL yolu |
| `options.samples` | `number` | Örnek sayısı |
| `options.method` | `string` | HTTP metodu |

**Dönüş:** `Promise<EndpointProfile>`

**Kullanım:**
```typescript
const profile = await profileEndpoint('/api/users', { samples: 100 });
// { avgLatency: 150, p95: 480, p99: 850 }
```

---

### `profileMemory(fn, options?)`

**Açıklama:** Bellek analizi yapar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `fn` | `() => void` | Analiz edilecek fonksiyon |
| `options.interval` | `number` | Örnekleme aralığı |

**Dönüş:** `Promise<MemoryProfile>`

**Kullanım:**
```typescript
const profile = await profileMemory(() => processLargeData());
// { heapUsed: 250MB, heapTotal: 512MB }
```

---

### `detectMemoryLeak(testFn, iterations?)`

**Açıklama:** Bellek sızıntısı tespit eder.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `testFn` | `() => Promise<void>` | - | Test fonksiyonu |
| `iterations` | `number` | `100` | Tekrar sayısı |

**Dönüş:** `Promise<LeakDetection>`

**Kullanım:**
```typescript
const leak = await detectMemoryLeak(async () => {
  await processRequest();
}, 200);
// { suspected: true, growthPercentage: 15, trend: 'growing' }
```

---

### `loadTest(endpoint, options)`

**Açıklama:** Yük testi çalıştırır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `endpoint` | `string` | Test edilecek URL |
| `options.concurrency` | `number` | Eşzamanlı istek |
| `options.duration` | `number` | Süre (saniye) |
| `options.method` | `string` | HTTP metodu |
| `options.payload` | `any` | POST body |

**Dönüş:** `Promise<LoadTestResult>`

**Kullanım:**
```typescript
const result = await loadTest('http://localhost:3000/api/users', {
  concurrency: 500,
  duration: 120,
});
// { totalRequests: 60000, throughput: 500, p99: 850 }
```

---

### `detectPerformanceRegression(benchmark, current)`

**Açıklama:** Performans gerilemesi tespit eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `benchmark` | `BenchmarkData` | Baz alınacak veri |
| `current` | `BenchmarkData` | Güncel veri |

**Dönüş:** `Promise<RegressionAnalysis>`

**Kullanım:**
```typescript
const regression = await detectPerformanceRegression(lastRelease, currentBuild);
// { hasRegression: true, changePercentage: 25, severity: 'high' }
```

---

### `getBenchmarkReport()`

**Açıklama:** Tüm benchmark'ları içeren rapor üretir.

**Dönüş:** `Promise<BenchmarkReport>`

**Kullanım:**
```typescript
const report = await getBenchmarkReport();
// { endpoints: [...], databaseQueries: [...], summary: {...} }
```

---

### `compareWithBaseline(current)`

**Açıklama:** Güncel veriyi baseline ile karşılaştırır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `current` | `BenchmarkData` | Güncel veri |

**Dönüş:** `Promise<Comparison>`

**Kullanım:**
```typescript
const comparison = await compareWithBaseline(currentData);
// { better: ['endpoint1'], worse: ['endpoint2'], same: ['endpoint3'] }
```

---

## 🔗 Delegasyon Özeti

| Kullandığı | Amaç |
|-----------|------|
| `@aegis/core` | Logger, AppError |
| `@aegis/observability` | Metrik verisi okuma |

---

## 📄 Lisans

MIT