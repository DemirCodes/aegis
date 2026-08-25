# ⚡ @aegis/resilience

**AEGIS Framework - Circuit Breaker & Retry Logic**

> Servis çökerse ne olur? Devre kesici, retry ve health-check ile sistem ayakta kalır.

**Bağımlılıklar:** `@aegis/core`

---

## 📦 Kurulum

```bash
pnpm add @aegis/resilience
```

---

## 🚀 Hızlı Başlangıç

```typescript
import {
  CircuitBreakerService,
  RetryService,
  HealthCheckService,
} from '@aegis/resilience';

const circuitBreaker = new CircuitBreakerService();
const retryService = new RetryService();
const healthCheck = new HealthCheckService();

// Circuit breaker ile güvenli çağrı
const result = await circuitBreaker.executeWithCircuitBreaker(
  'payment-api',
  () => paymentProvider.charge({ amount: 100 })
);

// Retry ile dayanıklı işlem
const data = await retryService.executeWithRetry(
  () => fetch('https://api.example.com'),
  { maxRetries: 3 }
);

// Health check kaydet
healthCheck.registerHealthCheck('database', async () => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
});
```

---

## 📌 Decorators

### `@GrpcCall(options)`

**Açıklama:** gRPC çağrısını retry + circuit breaker + timeout ile sarar.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `service` | `string` | - | Servis adı (`PaymentService`) |
| `method` | `string` | - | Metod adı (`processPayment`) |
| `retries` | `number` | `3` | Max deneme |
| `timeout` | `number` | `5000` | Zaman aşımı (ms) |
| `circuitBreaker` | `boolean` | `true` | CB kullanılsın mı? |
| `backoff` | `'exponential' \| 'linear'` | `'exponential'` | Backoff stratejisi |
| `fallback` | `() => any` | - | Hata durumunda çalışacak |

**Dönüş:** Decorator

**Kullanım:**
```typescript
import { GrpcCall } from '@aegis/resilience';

class OrderService {
  @GrpcCall({
    service: 'PaymentService',
    method: 'processPayment',
    retries: 3,
    timeout: 5000,
    circuitBreaker: true,
  })
  async createOrder(orderId: string) {
    // Otomatik retry + CB + timeout
  }
}
```

---

### `@CircuitBreaker(options?)`

**Açıklama:** Metodu circuit breaker ile sarar.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `failureThreshold` | `number` | `5` | Kaç hata sonra açılsın? |
| `resetTimeout` | `number` | `60000` | Kaç ms sonra yarı-açık? |
| `halfOpenRequests` | `number` | `1` | Yarı-açıkta kaç istek? |

**Dönüş:** Decorator

**Kullanım:**
```typescript
import { CircuitBreaker } from '@aegis/resilience';

class PaymentService {
  @CircuitBreaker({ failureThreshold: 5, resetTimeout: 60000 })
  async processPayment(req: PaymentRequest) {
    // 5 hata → OPEN → 1 dk → HALF-OPEN → test → CLOSED
  }
}
```

---

### `@Retry(options?)`

**Açıklama:** Metodu retry ile sarar.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `maxRetries` | `number` | `3` | Max deneme |
| `delay` | `number` | `1000` | Base delay (ms) |
| `backoffStrategy` | `'exponential' \| 'linear' \| 'none'` | `'exponential'` | Strateji |
| `jitter` | `boolean` | `false` | Rastgele gecikme ekle |
| `retryableErrors` | `string[]` | - | Sadece bu hatalarda dene |

**Dönüş:** Decorator

**Kullanım:**
```typescript
import { Retry } from '@aegis/resilience';

class EmailService {
  @Retry({ maxRetries: 5, backoffStrategy: 'exponential', jitter: true })
  async sendEmail(email: string) {
    // Başarısız olursa: 1s, 2s, 4s, 8s, 16s aralıklarla 5 kez dener
  }
}
```

---

## 📌 CircuitBreakerService

### `executeWithCircuitBreaker(key, fn, options?)`

**Açıklama:** Fonksiyonu circuit breaker ile çalıştırır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `key` | `string` | CB unique key (`payment-api`) |
| `fn` | `() => Promise<T>` | Çalıştırılacak fonksiyon |
| `options.failureThreshold` | `number` | Hata eşiği |
| `options.resetTimeout` | `number` | Reset süresi (ms) |

**Dönüş:** `Promise<T>`

**Kullandığı Core:** `core.AppError` (CIRCUIT_OPEN hatası)

**Kullanım:**
```typescript
const result = await circuitBreaker.executeWithCircuitBreaker(
  'payment-api',
  () => paymentProvider.charge({ amount: 100 }),
  { failureThreshold: 5, resetTimeout: 60000 }
);
// 5 hata → OPEN → "CIRCUIT_OPEN" AppError fırlatır
```

---

### `getCircuitStatus(key)`

**Açıklama:** Circuit breaker'ın current state'ini getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `key` | `string` | CB key |

**Dönüş:** `Promise<CircuitStatus>`

**Kullanım:**
```typescript
const status = await circuitBreaker.getCircuitStatus('payment-api');
// { state: 'open', failureCount: 7, nextRetryTime: '2024-01-15T10:35:00Z' }
```

---

### `getCircuitMetrics(key?)`

**Açıklama:** Circuit breaker metriklerini getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `key` | `string` | CB key (opsiyonel, boşsa tümü) |

**Dönüş:** `Promise<CircuitMetrics[]>`

**Kullanım:**
```typescript
const metrics = await circuitBreaker.getCircuitMetrics();
// [{ key: 'payment-api', totalRequests: 100, failureRate: 5, ... }]
```

---

### `resetCircuit(key)`

**Açıklama:** OPEN circuit'i manuel CLOSED'a getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `key` | `string` | CB key |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await circuitBreaker.resetCircuit('payment-api');
// Manuel reset (bakım sonrası vb.)
```

---

### `setThreshold(name, failureThreshold, successThreshold)`

**Açıklama:** Circuit breaker eşik değerlerini ayarlar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `name` | `string` | CB key |
| `failureThreshold` | `number` | Kaç hata sonra OPEN? |
| `successThreshold` | `number` | HALF-OPEN'da kaç başarı sonra CLOSED? |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await circuitBreaker.setThreshold('payment-api', 5, 3);
// 5 hata → OPEN → 3 başarı → CLOSED
```

---

## 📌 RetryService

### `executeWithRetry(fn, options?)`

**Açıklama:** Fonksiyonu retry logic ile çalıştırır. Framework'ün TEK retry motoru.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `fn` | `() => Promise<T>` | - | Çalıştırılacak fonksiyon |
| `options.maxRetries` | `number` | `3` | Max deneme |
| `options.delay` | `number` | `1000` | Base delay (ms) |
| `options.backoffStrategy` | `string` | `'exponential'` | Strateji |
| `options.jitter` | `boolean` | `false` | Jitter ekle |
| `options.retryableErrors` | `string[]` | - | Hata filtreleri |

**Dönüş:** `Promise<T>`

**Kullandığı Core:** `core.retry()` (delege eder)

**Kullanım:**
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
);
// 1s, 2s, 4s, 8s, 16s aralıklarla 5 kez dener
```

---

### `getRetryPolicy(operationName)`

**Açıklama:** Operasyon bazlı retry policy'sini getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `operationName` | `string` | `database-query`, `api-call` |

**Dönüş:** `RetryPolicy`

**Kullanım:**
```typescript
const policy = retryService.getRetryPolicy('database-query');
// { maxRetries: 3, baseDelay: 1000, backoffStrategy: 'exponential' }
```

---

### `setRetryPolicy(operationName, policy)`

**Açıklama:** Operasyon bazlı retry policy'sini set eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `operationName` | `string` | Operasyon adı |
| `policy` | `RetryPolicy` | Policy tanımı |

**Kullanım:**
```typescript
retryService.setRetryPolicy('email-send', {
  operationName: 'email-send',
  maxRetries: 5,
  baseDelay: 2000,
  backoffStrategy: 'exponential'
});
```

---

### `exponentialBackoff(attempt, baseDelay?)`

**Açıklama:** Exponential backoff delay hesaplar.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `attempt` | `number` | - | Deneme no (1-based) |
| `baseDelay` | `number` | `1000` | Base delay (ms) |

**Dönüş:** `number` - ms cinsinden delay

**Kullanım:**
```typescript
const delays = [1, 2, 3, 4, 5].map(n => exponentialBackoff(n));
// [1000, 2000, 4000, 8000, 16000]
```

---

### `jitteredBackoff(attempt, baseDelay?)`

**Açıklama:** Exponential backoff + rastgele jitter.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `attempt` | `number` | - | Deneme no |
| `baseDelay` | `number` | `1000` | Base delay (ms) |

**Dönüş:** `number` - Jitter'lı delay (ms)

**Kullanım:**
```typescript
const delay = jitteredBackoff(2);
// 2000 ± rastgele (1800-2600 arası gibi)
// Thundering herd problemi çözümü
```

---

### `linearBackoff(attempt, baseDelay?)`

**Açıklama:** Sabit artışlı backoff.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `attempt` | `number` | - | Deneme no |
| `baseDelay` | `number` | `1000` | Base delay (ms) |

**Dönüş:** `number` - ms cinsinden delay

**Kullanım:**
```typescript
const delays = [1, 2, 3].map(n => linearBackoff(n));
// [1000, 2000, 3000]
```

---

## 📌 HealthCheckService

### `registerHealthCheck(serviceName, checkFn)`

**Açıklama:** Bir servis için health-check tanımlar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `serviceName` | `string` | Servis adı (`database`, `redis`) |
| `checkFn` | `() => Promise<boolean>` | Kontrol fonksiyonu |

**Kullanım:**
```typescript
healthCheck.registerHealthCheck('database', async () => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
});
```

---

### `performHealthCheck(serviceName)`

**Açıklama:** Tek servisi kontrol eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `serviceName` | `string` | Servis adı |

**Dönüş:** `Promise<HealthCheckResult>`

**Kullanım:**
```typescript
const result = await healthCheck.performHealthCheck('database');
// { serviceName: 'database', status: 'healthy', responseTime: 15 }
```

---

### `getAllHealthStatus()`

**Açıklama:** Tüm kayıtlı servislerin durumunu getirir.

**Dönüş:** `Promise<Record<string, HealthCheckResult>>`

**Kullanım:**
```typescript
const allHealth = await healthCheck.getAllHealthStatus();
// { database: { status: 'healthy' }, redis: { status: 'healthy' } }
```

---

### `getUnhealthyServices()`

**Açıklama:** Sağlıksız servisleri listeler.

**Dönüş:** `Promise<string[]>` - Sağlıksız servis adları

**Kullanım:**
```typescript
const unhealthy = await healthCheck.getUnhealthyServices();
// ['payment-api', 'email-service']
```

---

### `checkDatabaseConnection()`

**Açıklama:** Hazır database health-check fonksiyonu.

**Dönüş:** `Promise<HealthCheckResult>`

**Kullanım:**
```typescript
const dbHealth = await healthCheck.checkDatabaseConnection();
// { serviceName: 'database', status: 'healthy', responseTime: 15 }
```

---

### `checkRedisConnection()`

**Açıklama:** Hazır Redis health-check fonksiyonu.

**Dönüş:** `Promise<HealthCheckResult>`

**Kullanım:**
```typescript
const redisHealth = await healthCheck.checkRedisConnection();
// { serviceName: 'redis', status: 'healthy', responseTime: 5 }
```

---

### `checkExternalService(url)`

**Açıklama:** Dış servis health-check fonksiyonu.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `url` | `string` | Servis URL'i (`https://api.example.com/health`) |

**Dönüş:** `Promise<HealthCheckResult>`

**Kullanım:**
```typescript
const externalHealth = await healthCheck.checkExternalService('https://api.stripe.com/health');
// { serviceName: 'external', status: 'healthy', responseTime: 250 }
```

---

## 🔗 Delegasyon Özeti

| Kullandığı | Fonksiyon | Amaç |
|-----------|-----------|------|
| `core` | `retry()` | Temel retry mekanizması |
| `core` | `AppError` | Circuit open hata fırlatma |
| `core` | `createLogger()` | Logging |
| `core` | `delay()` | Backoff bekletme |

---

## 📄 Lisans

MIT