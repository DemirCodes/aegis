# 📬 @aegis/queue

**AEGIS Framework - BullMQ Wrapper + Smart DLQ**

> İşleri arka planda güvenle çalıştır. Akıllı Dead Letter Queue, idempotency, otomatik retry.

**Bağımlılıklar:** `@aegis/core`, `@aegis/resilience`

---

## 📦 Kurulum

```bash
pnpm add @aegis/queue
```

---

## 🚀 Hızlı Başlangıç

```typescript
import { QueueService, DLQService, IdempotencyService } from '@aegis/queue';

const queueService = new QueueService();
const dlqService = new DLQService();
const idempotencyService = new IdempotencyService();

// İş ekle
const job = await queueService.addJob('email-queue', {
  to: 'user@example.com',
  template: 'welcome',
});

// Decorator ile otomatik queue
class EmailService {
  @QueueJob('email-queue', { priority: 10, attempts: 3 })
  async sendEmail(email: string, template: string) {
    // Otomatik queue'ye eklenir
  }
}
```

---

## 📌 Decorators

### `@QueueJob(queueName, options?)`

**Açıklama:** Metodu queue job'a dönüştürür. Otomatik retry, DLQ, timeout.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `queueName` | `string` | - | Queue adı (`email-queue`) |
| `priority` | `number` | - | Öncelik (1-100) |
| `attempts` | `number` | `3` | Max deneme |
| `timeout` | `number` | `30000` | Zaman aşımı (ms) |
| `backoff` | `BackoffOptions` | - | Backoff stratejisi |

**Dönüş:** Decorator

**Kullanım:**
```typescript
@QueueJob('email-queue', { priority: 10, attempts: 3, timeout: 30000 })
async sendEmail(email: string, template: string) {
  // Bu metod çağrılınca queue'ye eklenir
}
```

---

### `@Idempotent(key?, ttl?)`

**Açıklama:** Aynı isteğin iki kez işlenmesini engeller.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `key` | `string` | - | Idempotency key (opsiyonel) |
| `ttl` | `number` | `86400` | Süre (saniye, 1 gün) |

**Dönüş:** Decorator

**Kullandığı:** `IdempotencyService.ensureIdempotency()`

**Kullanım:**
```typescript
@Idempotent()
async transferMoney(amount: number, toAccount: string) {
  // Aynı istek 2. kez gelirse cache'ten döner
}
```

---

## 📌 QueueService

### `addJob(queueName, data, options?)`

**Açıklama:** Queue'ye yeni iş ekler.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `queueName` | `string` | Queue adı |
| `data` | `T` | İş verisi |
| `options.priority` | `number` | Öncelik |
| `options.attempts` | `number` | Max deneme |

**Dönüş:** `Promise<Job>`

**Kullanım:**
```typescript
const job = await queueService.addJob('email-queue', {
  to: 'user@example.com',
  template: 'welcome',
}, { priority: 10 });
```

---

### `addJobBatch(queueName, jobs)`

**Açıklama:** Birden fazla işi tek seferde ekler.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `queueName` | `string` | Queue adı |
| `jobs` | `T[]` | İş listesi |

**Dönüş:** `Promise<Job[]>`

**Kullanım:**
```typescript
const jobs = await queueService.addJobBatch('email-queue', [
  { to: 'user1@example.com', template: 'welcome' },
  { to: 'user2@example.com', template: 'welcome' },
]);
```

---

### `getJob(jobId)`

**Açıklama:** Belirli bir işi getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `jobId` | `string` | İş ID |

**Dönüş:** `Promise<Job | null>`

**Kullanım:**
```typescript
const job = await queueService.getJob('job-123');
```

---

### `getJobStatus(jobId)`

**Açıklama:** İşin durumunu getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `jobId` | `string` | İş ID |

**Dönüş:** `Promise<JobStatus>` - `pending | active | completed | failed | delayed`

**Kullanım:**
```typescript
const status = await queueService.getJobStatus('job-123');
// 'completed'
```

---

### `cancelJob(jobId)`

**Açıklama:** Pending işi iptal eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `jobId` | `string` | İş ID |

**Dönüş:** `Promise<boolean>`

**Kullanım:**
```typescript
const cancelled = await queueService.cancelJob('job-123');
```

---

### `retryJob(jobId)`

**Açıklama:** Başarısız işi tekrar dener.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `jobId` | `string` | İş ID |

**Dönüş:** `Promise<boolean>`

**Kullandığı:** `resilience.executeWithRetry()`

**Kullanım:**
```typescript
const retried = await queueService.retryJob('job-123');
```

---

### `getQueueStats(queueName)`

**Açıklama:** Queue istatistiklerini getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `queueName` | `string` | Queue adı |

**Dönüş:** `Promise<QueueStats>`

**Kullanım:**
```typescript
const stats = await queueService.getQueueStats('email-queue');
// { pending: 5, active: 2, completed: 100, failed: 3 }
```

---

### `getQueueMetrics()`

**Açıklama:** Tüm queue'lerin metriklerini getirir.

**Dönüş:** `Promise<QueueMetrics>`

**Kullanım:**
```typescript
const metrics = await queueService.getQueueMetrics();
// { totalQueues: 3, totalPending: 10, avgProcessingTime: 450 }
```

---

### `pauseQueue(queueName)`

**Açıklama:** Queue'yi duraklatır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `queueName` | `string` | Queue adı |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await queueService.pauseQueue('email-queue');
```

---

### `resumeQueue(queueName)`

**Açıklama:** Duraklatılan queue'yi devam ettirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `queueName` | `string` | Queue adı |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await queueService.resumeQueue('email-queue');
```

---

### `drainQueue(queueName)`

**Açıklama:** Queue'yi temizler.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `queueName` | `string` | Queue adı |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await queueService.drainQueue('email-queue');
```

---

## 📌 DLQService

### `getFailedJobs(filters?)`

**Açıklama:** Başarısız işleri listeler.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `filters.errorType` | `string` | Hata tipi filtresi |
| `filters.startDate` | `Date` | Başlangıç |
| `filters.endDate` | `Date` | Bitiş |

**Dönüş:** `Promise<FailedJob[]>`

**Kullanım:**
```typescript
const failedJobs = await dlqService.getFailedJobs({ errorType: 'timeout' });
```

---

### `classifyFailure(job, error)`

**Açıklama:** Hata tipini sınıflandırır (retriable/permanent/unknown).

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `job` | `Job` | İş |
| `error` | `Error` | Hata |

**Dönüş:** `Promise<FailureClassification>`

**Kullanım:**
```typescript
const classification = await dlqService.classifyFailure(job, error);
// { type: 'retriable', reason: 'ETIMEDOUT', suggestion: 'Increase timeout' }
// { type: 'permanent', reason: 'Invalid email', suggestion: 'Manual review' }
```

---

### `retryFailedJob(jobId, strategy?)`

**Açıklama:** Başarısız işi retry eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `jobId` | `string` | İş ID |
| `strategy` | `RetryStrategy` | Retry stratejisi |

**Dönüş:** `Promise<boolean>`

**Kullandığı:** `resilience.executeWithRetry()`

**Kullanım:**
```typescript
const success = await dlqService.retryFailedJob('job-123', { immediateRetry: true });
```

---

### `bulkRetryFailedJobs(filters?)`

**Açıklama:** Birden fazla başarısız işi toplu retry eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `filters` | `DLQFilters` | Filtreler |

**Dönüş:** `Promise<number>` - Retry edilen iş sayısı

**Kullanım:**
```typescript
const count = await dlqService.bulkRetryFailedJobs({ errorType: 'retriable' });
```

---

### `moveToArchive(jobId)`

**Açıklama:** Başarısız işi arşive taşır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `jobId` | `string` | İş ID |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await dlqService.moveToArchive('job-123');
```

---

### `getFailureStats(queueName?)`

**Açıklama:** Hata istatistiklerini getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `queueName` | `string` | Queue filtresi (opsiyonel) |

**Dönüş:** `Promise<FailureStats>`

**Kullanım:**
```typescript
const stats = await dlqService.getFailureStats();
// { totalFailed: 25, retriableCount: 18, permanentCount: 7 }
```

---

### `exportFailedJobs(format)`

**Açıklama:** Başarısız işleri dışa aktarır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `format` | `'json' \| 'csv'` | Çıktı formatı |

**Dönüş:** `Promise<Buffer>`

**Kullandığı Core:** `core.exportData()`

**Kullanım:**
```typescript
const csv = await dlqService.exportFailedJobs('csv');
```

---

## 📌 IdempotencyService

### `ensureIdempotency(key, fn, ttl?)`

**Açıklama:** Aynı key ile ikinci çağrıyı cache'ten döner.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `key` | `string` | - | Idempotency key |
| `fn` | `() => Promise<T>` | - | Çalıştırılacak fonksiyon |
| `ttl` | `number` | `86400` | Süre (saniye) |

**Dönüş:** `Promise<T>`

**Kullanım:**
```typescript
const result = await idempotencyService.ensureIdempotency(
  'transfer-123',
  () => accountService.transfer({ amount: 100, to: 'account-456' })
);
// 2. çağrı aynı key ile gelirse cache'ten döner
```

---

### `getIdempotencyResult(key)`

**Açıklama:** Önceki idempotent işlem sonucunu getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `key` | `string` | Idempotency key |

**Dönüş:** `Promise<T | null>`

**Kullanım:**
```typescript
const cachedResult = await idempotencyService.getIdempotencyResult('transfer-123');
```

---

### `setIdempotencyResult(key, result, ttl?)`

**Açıklama:** Idempotent işlem sonucunu saklar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `key` | `string` | Idempotency key |
| `result` | `T` | Sonuç |
| `ttl` | `number` | Süre (saniye) |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await idempotencyService.setIdempotencyResult('transfer-123', result, 3600);
```

---

### `deleteIdempotencyKey(key)`

**Açıklama:** Idempotency key'ini siler.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `key` | `string` | Idempotency key |

**Dönüş:** `Promise<boolean>`

**Kullanım:**
```typescript
const deleted = await idempotencyService.deleteIdempotencyKey('transfer-123');
```

---

## 🔗 Delegasyon Özeti

| Kullandığı | Fonksiyon | Amaç |
|-----------|-----------|------|
| `core` | `createLogger()` | Logging |
| `core` | `AppError` | Hata yönetimi |
| `core` | `exportData()` | Failed job export |
| `resilience` | `executeWithRetry()` | Retry mekanizması |
| `resilience` | `exponentialBackoff()` | Backoff hesaplama |
| `resilience` | `jitteredBackoff()` | Jitter'lı backoff |

---

## 📄 Lisans

MIT