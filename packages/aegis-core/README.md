# 🧠 @aegis/core

**AEGIS Framework - Ortak Altyapı Katmanı**

> Piramidin en alt katmanı. Diğer 13 paket buraya bağımlıdır. Kendisi **hiçbir pakete bağımlı DEĞİLDİR.**

---

## 📦 Kurulum

```bash
pnpm add @aegis/core
```

---

## 🎯 Ne İşe Yarar?

Diğer tüm paketlerin kullandığı ortak altyapı:
- 📝 Logger (Winston + Elasticsearch)
- ❌ Hata sınıfları (AppError, ValidationError)
- 🆔 ID üretimi (generateId, generateUUID, generateAuditId)
- 🔄 Retry mekanizması
- 🔍 Değişiklik tespiti (diffChanges)
- 🙈 Hassas veri maskeleme
- 📄 Sayfalama (normalizePagination)
- 📤 Export altyapısı (JSON/CSV/PDF)

---

## 📚 Tüm Fonksiyonlar

### 1. Logger

#### `createLogger(name, options?)`

**Açıklama:** İsimlendirilmiş bir logger üretir. Winston tabanlı, Elasticsearch destekli.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `name` | `string` | - | Logger adı (servis adı) |
| `options.level` | `'debug' \| 'info' \| 'warn' \| 'error'` | `'info'` | Log seviyesi |
| `options.format` | `'json' \| 'pretty'` | `'pretty'` | Çıktı formatı |
| `options.enableConsole` | `boolean` | `true` | Konsola yaz |
| `options.enableFile` | `boolean` | `false` | Dosyaya yaz |
| `options.enableElasticsearch` | `boolean` | `false` | Elasticsearch'e yaz |

**Dönüş:** `Logger`

**Kullanım:**
```typescript
import { createLogger } from '@aegis/core';

const log = createLogger('user-service', { level: 'debug' });

log.info('Kullanıcı oluşturuldu', { userId: '123' });
log.error('DB bağlantısı koptu', new Error('timeout'));
log.warn('Rate limit yaklaşıyor');
log.debug('Debug mesajı');
```

#### `logger`

**Açıklama:** Hazır default logger. `createLogger()` çağırmaya gerek yok.

**Kullanım:**
```typescript
import { logger } from '@aegis/core';

logger.info('Sunucu başladı');
logger.error('Kritik hata', new Error('DB timeout'));
logger.warn('Disk kullanımı %90');
```

---

### 2. Hata Yönetimi

#### `AppError`

**Açıklama:** Framework'ün TEK hata sınıfı. Tüm paketler bunu kullanır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `code` | `string` | Hata kodu (`ErrorCodes` veya özel) |
| `message` | `string` | Hata mesajı |
| `statusCode` | `number` | HTTP status (`HTTP_STATUS`) |
| `details` | `Record<string, any>` | Ek detay (opsiyonel) |

**Özellikler:**
- `name: 'AppError'`
- `timestamp: Date` - Otomatik eklenir
- `toJSON()` metodu

**Kullanım:**
```typescript
import { AppError } from '@aegis/core';

throw new AppError('NOT_FOUND', 'Kullanıcı bulunamadı', 404);
throw new AppError('VALIDATION_ERROR', 'Geçersiz veri', 400, { field: 'email' });
```

#### `ValidationError`

**Açıklama:** `AppError`'dan türeyen doğrulama hatası. `aegis/validation` paketi bunu kullanır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `message` | `string` | Hata mesajı |
| `errors` | `ValidationErrorDetail[]` | Detaylı hatalar |

```typescript
type ValidationErrorDetail = {
  path: string;    // 'email' veya 'user.email'
  message: string; // 'Geçersiz email'
  code: string;    // 'INVALID_EMAIL'
}
```

**Kullanım:**
```typescript
import { ValidationError } from '@aegis/core';

throw new ValidationError('Geçersiz veri', [
  { path: 'email', message: 'Geçersiz email formatı', code: 'INVALID_EMAIL' },
  { path: 'age', message: '18 yaşından küçük olamaz', code: 'TOO_YOUNG' }
]);
```

#### `handleError(error, context?)`

**Açıklama:** Hatayı standardize edip loglar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `error` | `Error` | Yakalanan hata |
| `context.userId` | `string` | Kullanıcı ID |
| `context.requestId` | `string` | Request ID |
| `context.operation` | `string` | İşlem adı |
| `context.metadata` | `Record<string, any>` | Ek metadata |

**Dönüş:** `void`

**Kullanım:**
```typescript
import { handleError } from '@aegis/core';

try {
  await someOperation();
} catch (error) {
  handleError(error as Error, {
    userId: 'user-123',
    operation: 'someOperation',
  });
}
```

---

### 3. ID Üretimi

#### `generateId(prefix?, length?)`

**Açıklama:** Genel amaçlı unique ID.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `prefix` | `string` | - | ID öneki |
| `length` | `number` | `12` | ID uzunluğu |

**Dönüş:** `string`

**Kullanım:**
```typescript
import { generateId } from '@aegis/core';

generateId()            // 'a1b2c3d4e5f6'
generateId('user')      // 'user_a1b2c3d4e5f6'
generateId('order', 16) // 'order_a1b2c3d4e5f6a7b8'
```

#### `generateUUID()`

**Açıklama:** Standart UUID v4.

**Dönüş:** `string`

**Kullanım:**
```typescript
import { generateUUID } from '@aegis/core';

generateUUID(); // '550e8400-e29b-41d4-a716-446655440000'
```

#### `generateAuditId()`

**Açıklama:** Audit log ID'si. **TEK KAYNAK** - sadece burada tanımlı. `@aegis/audit` paketi bunu kullanır.

**Dönüş:** `string` - Format: `audit_[16 hex]`

**Kullanım:**
```typescript
import { generateAuditId } from '@aegis/core';

generateAuditId(); // 'audit_9f3a2b1c4d5e6f7a'
```

---

### 4. Yardımcı Fonksiyonlar

#### `delay(ms)`

**Açıklama:** Async bekleme.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `ms` | `number` | Beklenecek süre (milisaniye) |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
import { delay } from '@aegis/core';

await delay(2000); // 2 saniye bekle
```

#### `toJSON(data, options?)`

**Açıklama:** Circular-ref güvenli JSON string. BigInt, Map, Set, Date destekler.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `data` | `any` | - | Dönüştürülecek veri |
| `options.pretty` | `boolean` | `false` | Formatlı çıktı |
| `options.maxDepth` | `number` | `Infinity` | Max derinlik |

**Dönüş:** `string`

**Kullanım:**
```typescript
import { toJSON } from '@aegis/core';

const obj: any = { name: 'Ali', age: 25 };
obj.self = obj; // circular reference

toJSON(obj);                    // '{"name":"Ali","age":25,"self":"[Circular]"}'
toJSON(obj, { pretty: true });  // Formatlı JSON
toJSON(obj, { maxDepth: 2 });   // Derinlik sınırlı
```

#### `loadEnv(path?)`

**Açıklama:** `.env` dosyasını yükler.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `path` | `string` | `'.env'` | .env dosya yolu |

**Dönüş:** `void`

**Kullanım:**
```typescript
import { loadEnv } from '@aegis/core';

loadEnv('.env.local');
console.log(process.env.DATABASE_URL);
```

---

### 5. Retry

#### `retry(fn, options?)`

**Açıklama:** Düşük seviye jenerik retry. 
> ⚠️ **Not:** Production kodunda `resilience.executeWithRetry()` kullanılmalı. Bu sadece core'un dahili/basit ihtiyaçları içindir.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `fn` | `() => Promise<T>` | - | Çalıştırılacak fonksiyon |
| `options.maxRetries` | `number` | `3` | Max deneme sayısı |
| `options.delay` | `number` | `1000` | Base delay (ms) |
| `options.backoffStrategy` | `'exponential' \| 'linear' \| 'none'` | `'exponential'` | Backoff stratejisi |

**Dönüş:** `Promise<T>`

**Kullanım:**
```typescript
import { retry } from '@aegis/core';

const data = await retry(
  () => fetch('https://api.example.com'),
  { maxRetries: 3, backoffStrategy: 'exponential' }
);
```

---

### 6. Değişiklik Tespiti

#### `diffChanges(oldData, newData, excludeFields?)`

**Açıklama:** İki obje arasındaki farkı çıkarır. `@aegis/audit` paketi bunu kullanır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `oldData` | `any` | Eski veri |
| `newData` | `any` | Yeni veri |
| `excludeFields` | `string[]` | Hariç tutulacak alanlar |

**Dönüş:** `ChangesMap`
```typescript
type ChangesMap = Record<string, { old: any; new: any }>;
```

**Kullanım:**
```typescript
import { diffChanges } from '@aegis/core';

const changes = diffChanges(
  { name: 'Ali', age: 25 },
  { name: 'Ali', age: 26 },
  ['name'] // name alanını hariç tut
);
// { age: { old: 25, new: 26 } }
```

#### `formatChangesSummary(changes, maxLength?)`

**Açıklama:** Farkı okunabilir cümleye çevirir. `@aegis/audit` bunu kullanır.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `changes` | `ChangesMap` | - | Değişiklikler |
| `maxLength` | `number` | `200` | Max uzunluk |

**Dönüş:** `string`

**Kullanım:**
```typescript
import { formatChangesSummary } from '@aegis/core';

formatChangesSummary({ age: { old: 25, new: 26 } });
// 'age: 25 → 26'
```

---

### 7. Hassas Veri Maskeleme

#### `maskSensitiveData(data, sensitiveFields?)`

**Açıklama:** Hassas alanları `[REDACTED]` yapar. Recursive çalışır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `data` | `any` | Maskelenecek veri |
| `sensitiveFields` | `string[]` | Ekstra hassas alanlar |

**Dönüş:** Maskelenmiş veri

**Kullanım:**
```typescript
import { maskSensitiveData } from '@aegis/core';

const data = { password: 'secret', creditCard: '1234', name: 'Ali' };
maskSensitiveData(data);
// { password: '[REDACTED]', creditCard: '[REDACTED]', name: 'Ali' }
```

#### `DEFAULT_SENSITIVE_FIELDS`

**Değer:**
```typescript
['password', 'creditCard', 'ssn', 'token', 'apiKey', 'privateKey']
```

---

### 8. Sayfalama

#### `normalizePagination(options?)`

**Açıklama:** page/pageSize'a default uygular.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `page` | `number` | `1` | Sayfa no |
| `pageSize` | `number` | `20` | Sayfa başına kayıt |

**Dönüş:** `{ page: number; pageSize: number }`

**Kullanım:**
```typescript
import { normalizePagination } from '@aegis/core';

normalizePagination();                    // { page: 1, pageSize: 20 }
normalizePagination({ page: 2 });         // { page: 2, pageSize: 20 }
normalizePagination({ pageSize: 50 });    // { page: 1, pageSize: 50 }
```

#### Sabitler
```typescript
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 1000
DEFAULT_CACHE_TTL = 3600  // saniye cinsinden
```

---

### 9. Export

#### `exportData(rows, format, options?)`

**Açıklama:** JSON/CSV/PDF'e jenerik export. `@aegis/audit`, `@aegis/queue`, `@aegis/security` bunu kullanır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `rows` | `any[]` | Export edilecek veri |
| `format` | `'json' \| 'csv' \| 'pdf'` | Çıktı formatı |
| `options` | `any` | Ek seçenekler |

**Dönüş:** `Buffer`

**Kullanım:**
```typescript
import { exportData } from '@aegis/core';

const jsonBuffer = await exportData(logs, 'json');
const csvBuffer = await exportData(logs, 'csv');
const pdfBuffer = await exportData(logs, 'pdf');
// Buffer → dosyaya yaz veya email'e ekle
```

---

### 10. Decorator

#### `@Deprecated(message?)`

**Açıklama:** Metodu deprecated işaretler. Çağrıldığında warning loglar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `message` | `string` | Uyarı mesajı |

**Kullanım:**
```typescript
import { Deprecated } from '@aegis/core';

class OldService {
  @Deprecated('Use NewService.userList() instead')
  getUserList() {
    // Bu metod çağrıldığında warning loglanır
  }
}
```

---

## 📊 Sabitler

### HTTP_STATUS
```typescript
HTTP_STATUS.OK = 200
HTTP_STATUS.CREATED = 201
HTTP_STATUS.ACCEPTED = 202
HTTP_STATUS.NO_CONTENT = 204
HTTP_STATUS.BAD_REQUEST = 400
HTTP_STATUS.UNAUTHORIZED = 401
HTTP_STATUS.FORBIDDEN = 403
HTTP_STATUS.NOT_FOUND = 404
HTTP_STATUS.CONFLICT = 409
HTTP_STATUS.UNPROCESSABLE_ENTITY = 422
HTTP_STATUS.RATE_LIMITED = 429
HTTP_STATUS.INTERNAL_ERROR = 500
HTTP_STATUS.SERVICE_UNAVAILABLE = 503
```

### ErrorCodes
```typescript
ErrorCodes.VALIDATION_ERROR = 'VALIDATION_ERROR'
ErrorCodes.AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR'
ErrorCodes.NOT_FOUND = 'NOT_FOUND'
ErrorCodes.CONFLICT = 'CONFLICT'
ErrorCodes.INTERNAL_ERROR = 'INTERNAL_ERROR'
ErrorCodes.SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
ErrorCodes.RATE_LIMITED = 'RATE_LIMITED'
ErrorCodes.DATABASE_ERROR = 'DATABASE_ERROR'
ErrorCodes.EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
```

---

## 🔗 Kim Kullanıyor?

| Paket | Kullandığı Core Fonksiyonları |
|-------|-------------------------------|
| `@aegis/audit` | `logger`, `AppError`, `generateAuditId`, `diffChanges`, `formatChangesSummary`, `maskSensitiveData`, `exportData`, `normalizePagination` |
| `@aegis/observability` | `logger`, `AppError`, `generateId` |
| `@aegis/resilience` | `logger`, `AppError`, `retry` |
| `@aegis/cache` | `logger`, `AppError`, `DEFAULT_CACHE_TTL` |
| `@aegis/validation` | `logger`, `ValidationError` |
| `@aegis/queue` | `logger`, `AppError`, `exportData` |
| `@aegis/security` | `logger`, `AppError`, `generateId` |

---

## 📄 Lisans

MIT