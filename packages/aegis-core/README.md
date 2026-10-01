# 🧠 @aegis/core

**AEGIS Framework - Shared Foundation Layer**

> Piramidin en alt katmanı. Diğer 13 paket buraya bağımlıdır. Kendisi **hiçbir pakete bağımlı DEĞİLDİR.**

**Bağımlılıklar:** Yok (framework'ün tabanı)

---

## 📦 Kurulum

```bash
pnpm add @aegis/core
```

---

## 🎯 Ne İşe Yarar?

Diğer tüm paketlerin kullandığı ortak altyapı:

- 📝 **Logger** — Winston + Elasticsearch, otomatik hassas veri maskeleme
- ❌ **Hata Sınıfları** — `AppError` + `ValidationError`, severity ve kategori sistemiyle
- 🆔 **ID Üretimi** — `generateId`, `generateUUID` (crypto native)
- 🔄 **Retry** — Exponential / linear / fixed backoff stratejileri
- 🔍 **Değişiklik Tespiti** — `diffChanges` + `formatChangesSummary`
- 🙈 **Hassas Veri Maskeleme** — `maskSensitiveData` (token-based match)
- 📄 **Sayfalama** — `normalizePagination` (offset/limit dahil)
- 📤 **Export** — JSON / CSV / PDF (`exportData`)
- 🔧 **Yardımcılar** — `delay`, `toJSON`, `loadEnv`, `handleError`
- 🏷️ **Decorator** — `@Deprecated`

---

## 🚀 Hızlı Başlangıç

```typescript
import {
  logger,
  createLogger,
  AppError,
  ValidationError,
  ErrorCodes,
  ErrorSeverity,
  HTTP_STATUS,
  retry,
  delay,
  toJSON,
  generateId,
  generateUUID,
  maskSensitiveData,
  diffChanges,
  normalizePagination,
  exportData,
} from '@aegis/core';

// Logger
logger.info('Application started', { version: '0.1.0' });

// Hata
throw new AppError({
  code: ErrorCodes.NOT_FOUND,
  message: 'User not found',
});

// Retry
const data = await retry(
  () => fetch('https://api.example.com'),
  { maxRetries: 3, backoffStrategy: 'exponential' },
);

// Hassas veri maskeleme
maskSensitiveData({ userPassword: 'x', name: 'Ali' });
// { userPassword: '[REDACTED]', name: 'Ali' }

// Değişiklik tespiti
diffChanges(
  { name: 'Ali', age: 25 },
  { name: 'Ali', age: 26 },
);
// { age: { old: 25, new: 26 } }

// Sayfalama
normalizePagination({ page: 3, pageSize: 50 });
// { page: 3, pageSize: 50, offset: 100, limit: 50 }

// Export
const csvBuffer = await exportData(users, 'csv');
```

---

## 🗂️ Dosya Yapısı

```
src/
├── index.ts                                    → Ana barrel export (public API)
├── constants/
│   ├── index.ts                                → barrel
│   ├── app-constants.ts                        → APP_NAME, APP_VERSION,
│   │                                              AUDIT_DEFAULT_RETENTION_DAYS,
│   │                                              AUDIT_MAX_BATCH_SIZE,
│   │                                              AUDIT_FLUSH_INTERVAL_MS,
│   │                                              DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE,
│   │                                              DEFAULT_CACHE_TTL,
│   │                                              DEFAULT_RATE_LIMIT_WINDOW,
│   │                                              DEFAULT_RATE_LIMIT_MAX, HTTP_STATUS
│   └── error-codes.ts                          → ErrorCodes, ErrorSeverity,
│                                                  ErrorCategory, AuditAction,
│                                                  ERROR_SEVERITY_MAP, HTTP_STATUS_MAP,
│                                                  ERROR_CATEGORY_MAP,
│                                                  getHttpStatus, getCategory, getSeverity,
│                                                  isCriticalError, isRetryableError,
│                                                  shouldAuditError
├── decorators/
│   └── deprecated.decorator.ts                 → Deprecated
├── errors/
│   ├── index.ts                                → barrel
│   ├── app-error.ts                            → AppError, AppErrorOptions
│   ├── error-codes.ts                          → (dead code - kullanılmıyor)
│   └── validation-error.ts                     → ValidationError, ValidationErrorItem
├── types/
│   ├── index.ts                                → barrel
│   ├── common.types.ts                         → PaginationOptions, PaginatedResult,
│   │                                              ChangesMap, ApiResponse, ApiError,
│   │                                              Timestamps, Status, AuditMetadata,
│   │                                              DatabaseConfig, RedisConfig,
│   │                                              SerializationOptions
│   └── errors.types.ts                         → AppErrorType, ErrorContext,
│                                                  LogLevel, LoggerOptions,
│                                                  BackoffOptions
└── utils/
    ├── index.ts                                → barrel
    ├── logger.ts                               → createLogger, logger,
    │                                              LogLevel, LoggerOptions, Logger
    ├── error-handler.ts                        → handleError
    ├── env-loader.ts                           → loadEnv
    ├── common-helpers.ts                       → delay, toJSON
    ├── id-generator.ts                         → generateId, generateUUID
    ├── retry.ts                                → retry, RetryOptions
    ├── mask-helpers.ts                         → maskSensitiveData,
    │                                              DEFAULT_SENSITIVE_FIELDS
    ├── diff-helpers.ts                         → diffChanges, formatChangesSummary
    ├── pagination-helpers.ts                   → normalizePagination,
    │                                              NormalizedPagination
    └── export-helpers.ts                       → exportData, ExportFormat, ExportOptions
```

---

## 📐 Naming Convention

| Kategori | Kural | Örnek |
|----------|-------|-------|
| **Fonksiyonlar** | camelCase | `createLogger()`, `maskSensitiveData()`, `normalizePagination()` |
| **Sınıflar** | PascalCase | `AppError`, `ValidationError` |
| **Sabit değerler** | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE`, `HTTP_STATUS`, `APP_NAME` |
| **Tip / Interface** | PascalCase | `PaginationOptions`, `AppErrorOptions`, `ChangesMap` |
| **Enum değerleri** | UPPER_SNAKE_CASE | `ErrorCodes.NOT_FOUND`, `ErrorSeverity.CRITICAL` |
| **Dosya adları** | kebab-case | `app-error.ts`, `mask-helpers.ts`, `error-handler.ts` |
| **Env değişkenleri** | UPPER_SNAKE_CASE | `LOG_LEVEL`, `ELASTICSEARCH_URL`, `NODE_ENV` |
| **Logger meta alanları** | camelCase | `userId`, `requestId`, `correlationId` |

---

## 📌 Paket Prensipleri

1. **Bağımlılık sıfır** — `core` hiçbir `@aegis/*` paketine bağımlı değildir.
2. **Tek doğruluk kaynağı** — Ortak semboller burada tanımlanır, diğer paketler buradan import eder.
3. **Duplikasyon yasak** — Aynı sembol iki yerde tanımlanamaz.
4. **Refactor dostu** — Tüm public API `src/index.ts`'ten tek noktadan export edilir.
5. **Type-safe** — Tüm export'lar tipli (union type, generic, interface).

---

## 🧩 Harici Bağımlılıklar

`@aegis/core` **hiçbir `@aegis/*` paketine bağımlı değildir.** Kullandığı tüm paketler harici npm paketleridir:

```typescript
import winston from 'winston';
import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';
import { randomUUID } from 'crypto';   // Node.js native
import path from 'path';                // Node.js native
import fs from 'fs';                    // Node.js native
```

### Paket Bağımlılık Tablosu

| Paket | Sürüm | Kullanım |
|-------|-------|----------|
| `winston` | `^3.11.0` | Logger altyapısı |
| `dotenv` | `^16.3.0` | `.env` dosyası yükleme |
| `pdfkit` | `^0.15.0` | PDF export |
| `uuid` | `^14.0.0` | (⚠️ kodda `crypto.randomUUID` kullanılıyor — bu bağımlılık kullanılmıyor olabilir) |

### Referans Tipler

| Tip | Kaynak | Açıklama |
|-----|--------|----------|
| `winston.transport` | `winston` | Winston transport arayüzü |
| `PDFDocument` | `pdfkit` | PDF doküman sınıfı |
| `randomUUID` | `crypto` (Node native) | UUID v4 üretici |

---

## 📌 Constants

### Uygulama Metadata

```typescript
import { APP_NAME, APP_VERSION } from '@aegis/core';

APP_NAME;     // 'AEGIS'
APP_VERSION;  // '0.1.0'
```

| Sembol | Tip | Değer | Açıklama |
|--------|-----|-------|----------|
| `APP_NAME` | `string` | `'AEGIS'` | Framework adı (log ve header'larda kullanılır) |
| `APP_VERSION` | `string` | `'0.1.0'` | Semver uyumlu versiyon |

---

### Audit Ayarları

```typescript
import {
  AUDIT_DEFAULT_RETENTION_DAYS,
  AUDIT_MAX_BATCH_SIZE,
  AUDIT_FLUSH_INTERVAL_MS,
} from '@aegis/core';

AUDIT_DEFAULT_RETENTION_DAYS;  // 90
AUDIT_MAX_BATCH_SIZE;          // 1000
AUDIT_FLUSH_INTERVAL_MS;       // 5000
```

| Sembol | Tip | Değer | Açıklama |
|--------|-----|-------|----------|
| `AUDIT_DEFAULT_RETENTION_DAYS` | `number` | `90` | Audit log'ların varsayılan saklanma süresi (gün) |
| `AUDIT_MAX_BATCH_SIZE` | `number` | `1000` | Tek seferde yazılacak maksimum audit kaydı |
| `AUDIT_FLUSH_INTERVAL_MS` | `number` | `5000` | Buffer'daki audit log'ların diske yazılma sıklığı (ms) |

---

### Sayfalama Ayarları

```typescript
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@aegis/core';

DEFAULT_PAGE_SIZE;  // 20
MAX_PAGE_SIZE;      // 100
```

| Sembol | Tip | Değer | Açıklama |
|--------|-----|-------|----------|
| `DEFAULT_PAGE_SIZE` | `number` | `20` | Liste sorgularında varsayılan sayfa boyutu |
| `MAX_PAGE_SIZE` | `number` | `100` | İzin verilen maksimum sayfa boyutu |

---

### Cache Ayarları

```typescript
import { DEFAULT_CACHE_TTL } from '@aegis/core';

DEFAULT_CACHE_TTL;  // 3600 (saniye = 1 saat)
```

| Sembol | Tip | Değer | Açıklama |
|--------|-----|-------|----------|
| `DEFAULT_CACHE_TTL` | `number` | `3600` | Cache'lenen verinin varsayılan yaşam süresi (saniye) |

---

### Rate Limit Ayarları

```typescript
import {
  DEFAULT_RATE_LIMIT_WINDOW,
  DEFAULT_RATE_LIMIT_MAX,
} from '@aegis/core';

DEFAULT_RATE_LIMIT_WINDOW;  // 60000 (ms = 1 dakika)
DEFAULT_RATE_LIMIT_MAX;     // 100
```

| Sembol | Tip | Değer | Açıklama |
|--------|-----|-------|----------|
| `DEFAULT_RATE_LIMIT_WINDOW` | `number` | `60000` | Rate limit sayacının sıfırlanma aralığı (ms) |
| `DEFAULT_RATE_LIMIT_MAX` | `number` | `100` | Pencere başına izin verilen maksimum istek sayısı |

---

### HTTP_STATUS

```typescript
import { HTTP_STATUS } from '@aegis/core';

HTTP_STATUS.OK;                     // 200
HTTP_STATUS.CREATED;                // 201
HTTP_STATUS.NO_CONTENT;             // 204
HTTP_STATUS.BAD_REQUEST;            // 400
HTTP_STATUS.UNAUTHORIZED;           // 401
HTTP_STATUS.FORBIDDEN;              // 403
HTTP_STATUS.NOT_FOUND;              // 404
HTTP_STATUS.CONFLICT;               // 409
HTTP_STATUS.TOO_MANY_REQUESTS;      // 429
HTTP_STATUS.INTERNAL_SERVER_ERROR;  // 500
HTTP_STATUS.SERVICE_UNAVAILABLE;    // 503
```

| Sembol | Tip | Değer |
|--------|-----|-------|
| `HTTP_STATUS.OK` | `200` | İstek başarılı |
| `HTTP_STATUS.CREATED` | `201` | Kaynak oluşturuldu |
| `HTTP_STATUS.NO_CONTENT` | `204` | Başarılı, gövde yok |
| `HTTP_STATUS.BAD_REQUEST` | `400` | Geçersiz istek |
| `HTTP_STATUS.UNAUTHORIZED` | `401` | Kimlik doğrulama gerekli |
| `HTTP_STATUS.FORBIDDEN` | `403` | Yetki yetersiz |
| `HTTP_STATUS.NOT_FOUND` | `404` | Kaynak bulunamadı |
| `HTTP_STATUS.CONFLICT` | `409` | Kaynak çakışması |
| `HTTP_STATUS.TOO_MANY_REQUESTS` | `429` | Rate limit aşıldı |
| `HTTP_STATUS.INTERNAL_SERVER_ERROR` | `500` | Sunucu hatası |
| `HTTP_STATUS.SERVICE_UNAVAILABLE` | `503` | Servis kullanım dışı |

### `HttpStatusCode`

```typescript
type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];
```

---

### ErrorCodes

**Açıklama:** Framework genelinde kullanılan ~70+ hata kodu. Kategorilere ayrılmıştır.

```typescript
import { ErrorCodes } from '@aegis/core';

ErrorCodes.INTERNAL_ERROR;
ErrorCodes.NOT_FOUND;
ErrorCodes.VALIDATION_ERROR;
ErrorCodes.UNAUTHORIZED;
ErrorCodes.FORBIDDEN;
ErrorCodes.CONFLICT;
ErrorCodes.TOO_MANY_REQUESTS;
// ... (toplam ~70+ kod)
```

**Kategoriler:**

| Kategori | Örnek Kodlar |
|----------|--------------|
| **Genel** | `INTERNAL_ERROR`, `NOT_FOUND`, `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `TOO_MANY_REQUESTS` |
| **Güvenlik** | `SECURITY_TOKEN_EXPIRED`, `SECURITY_TOKEN_INVALID`, `SECURITY_CSRF_INVALID`, `SECURITY_BRUTE_FORCE`, `SECURITY_IP_BLOCKED`, `TOKEN_EXPIRED`, `TOKEN_REVOKED`, `RATE_LIMIT_EXCEEDED`, `IP_BLACKLISTED`, `RISK_SCORE_HIGH` |
| **Performans** | `PERFORMANCE_TIMEOUT`, `PERFORMANCE_CPU_OVERLOAD`, `PERFORMANCE_MEMORY_OVERLOAD`, `PERFORMANCE_CONNECTION_POOL_EXHAUSTED`, `PERFORMANCE_RESOURCE_LEAK` |
| **Queue** | `QUEUE_CONNECTION_FAILED`, `QUEUE_PUBLISH_FAILED`, `QUEUE_CONSUME_FAILED`, `QUEUE_DLQ_FULL`, `QUEUE_RETRY_EXHAUSTED`, `QUEUE_BACKPRESSURE`, `QUEUE_JOB_FAILED`, `DLQ_PROCESSING_FAILED` |
| **Database** | `DB_CONNECTION_FAILED`, `DB_CONNECTION_TIMEOUT`, `DB_QUERY_FAILED`, `DB_QUERY_TIMEOUT`, `DB_DEADLOCK`, `DB_MIGRATION_FAILED`, `DB_REPLICATION_LAG`, `DB_POOL_EXHAUSTED`, `DB_CORRUPTED_DATA` |
| **Cache** | `CACHE_CONNECTION_FAILED`, `CACHE_READ_FAILED`, `CACHE_WRITE_FAILED`, `CACHE_INVALIDATION_FAILED`, `CACHE_MEMORY_FULL`, `CACHE_MISS`, `CACHE_ERROR` |
| **External** | `EXTERNAL_API_TIMEOUT`, `EXTERNAL_API_FAILED`, `EXTERNAL_SERVICE_UNAVAILABLE`, `EXTERNAL_CIRCUIT_BREAKER_OPEN`, `EXTERNAL_DNS_RESOLUTION_FAILED` |
| **Storage** | `STORAGE_DISK_FULL`, `STORAGE_READ_FAILED`, `STORAGE_WRITE_FAILED`, `STORAGE_FILE_NOT_FOUND`, `STORAGE_FILE_TOO_LARGE`, `STORAGE_BACKUP_FAILED` |
| **Network** | `NETWORK_CONNECTION_FAILED`, `NETWORK_DNS_FAILED`, `NETWORK_TIMEOUT`, `NETWORK_BANDWIDTH_EXCEEDED` |
| **Critical** | `CRITICAL_SYSTEM_PANIC`, `CRITICAL_OUT_OF_MEMORY`, `CRITICAL_SERVICE_HEALTH_FAILED`, `CRITICAL_STARTUP_FAILED`, `CRITICAL_DATA_CORRUPTION`, `CRITICAL_DEADLOCK` |
| **Audit** | `AUDIT_LOG_FAILED`, `GDPR_DELETION_FAILED` |
| **Resilience** | `CIRCUIT_OPEN`, `RETRY_EXHAUSTED` |

### `ErrorCode`

```typescript
type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
```

---

### ErrorSeverity

**Açıklama:** Hata önem seviyesi (sayısal enum — audit ve monitoring için).

```typescript
import { ErrorSeverity } from '@aegis/core';

ErrorSeverity.DEBUG;      // 0
ErrorSeverity.INFO;       // 1
ErrorSeverity.WARNING;    // 2
ErrorSeverity.ERROR;      // 3
ErrorSeverity.CRITICAL;   // 4
```

| Değer | Sayı | Açıklama |
|-------|------|----------|
| `DEBUG` | `0` | Sadece development'ta loglanır |
| `INFO` | `1` | Bilgilendirme (işlem başarılı ama not düşülmeli) |
| `WARNING` | `2` | Potansiyel sorun (işlem devam eder) |
| `ERROR` | `3` | İşlem başarısız (müdahale gerekebilir) |
| `CRITICAL` | `4` | Sistem çöküşü (acil müdahale şart) |

---

### ErrorCategory

**Açıklama:** Hata kategorileri.

```typescript
import { ErrorCategory } from '@aegis/core';

ErrorCategory.SECURITY;     // 'SECURITY'
ErrorCategory.PERFORMANCE;  // 'PERFORMANCE'
ErrorCategory.QUEUE;        // 'QUEUE'
ErrorCategory.DATABASE;     // 'DATABASE'
ErrorCategory.CACHE;        // 'CACHE'
ErrorCategory.EXTERNAL;     // 'EXTERNAL'
ErrorCategory.STORAGE;      // 'STORAGE'
ErrorCategory.NETWORK;      // 'NETWORK'
ErrorCategory.CRITICAL;     // 'CRITICAL'
ErrorCategory.AUDIT;        // 'AUDIT'
ErrorCategory.RESILIENCE;   // 'RESILIENCE'
ErrorCategory.GENERAL;      // 'GENERAL'
```

---

### AuditAction

**Açıklama:** Audit olay tipleri.

```typescript
import { AuditAction } from '@aegis/core';

AuditAction.SYSTEM_STARTUP;    // 'SYSTEM_STARTUP'
AuditAction.SYSTEM_SHUTDOWN;   // 'SYSTEM_SHUTDOWN'
AuditAction.CONFIG_CHANGE;     // 'CONFIG_CHANGE'
AuditAction.DATA_CREATE;       // 'DATA_CREATE'
AuditAction.DATA_READ;         // 'DATA_READ'
AuditAction.DATA_UPDATE;       // 'DATA_UPDATE'
AuditAction.DATA_DELETE;       // 'DATA_DELETE'
AuditAction.USER_LOGIN;        // 'USER_LOGIN'
AuditAction.USER_LOGOUT;       // 'USER_LOGOUT'
AuditAction.USER_LOCKED;       // 'USER_LOCKED'
AuditAction.PERMISSION_CHANGE; // 'PERMISSION_CHANGE'
AuditAction.ROLE_CHANGE;       // 'ROLE_CHANGE'
AuditAction.ERROR_OCCURRED;    // 'ERROR_OCCURRED'
```

---

### Map'ler (ErrorCode → Değer)

```typescript
import {
  ERROR_SEVERITY_MAP,
  HTTP_STATUS_MAP,
  ERROR_CATEGORY_MAP,
} from '@aegis/core';

ERROR_SEVERITY_MAP[ErrorCodes.NOT_FOUND];   // ErrorSeverity.WARNING
HTTP_STATUS_MAP[ErrorCodes.NOT_FOUND];      // 404
ERROR_CATEGORY_MAP[ErrorCodes.NOT_FOUND];   // 'GENERAL'
```

| Sembol | Tip | Açıklama |
|--------|-----|----------|
| `ERROR_SEVERITY_MAP` | `Record<ErrorCode, ErrorSeverity>` | Her hata kodunun önem seviyesi |
| `HTTP_STATUS_MAP` | `Record<ErrorCode, number>` | Her hata kodunun HTTP status kodu |
| `ERROR_CATEGORY_MAP` | `Record<ErrorCode, ErrorCategory>` | Her hata kodunun kategorisi |

---

### Yardımcı Fonksiyonlar

#### `getHttpStatus(code)`

**Açıklama:** Hata koduna karşılık gelen HTTP durum kodunu döner.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `code` | `ErrorCode` | Hata kodu |

**Dönüş:** `number`

```typescript
getHttpStatus(ErrorCodes.NOT_FOUND);  // 404
```

---

#### `getCategory(code)`

**Açıklama:** Hata kodunun kategorisini döner.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `code` | `ErrorCode` | Hata kodu |

**Dönüş:** `ErrorCategory`

```typescript
getCategory(ErrorCodes.DB_CONNECTION_FAILED);  // 'DATABASE'
```

---

#### `getSeverity(code)`

**Açıklama:** Hata kodunun önem seviyesini döner.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `code` | `ErrorCode` | Hata kodu |

**Dönüş:** `ErrorSeverity`

```typescript
getSeverity(ErrorCodes.CRITICAL_OUT_OF_MEMORY);  // ErrorSeverity.CRITICAL
```

---

#### `isCriticalError(code)`

**Açıklama:** Hatanın kritik seviyede olup olmadığını kontrol eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `code` | `ErrorCode` | Hata kodu |

**Dönüş:** `boolean`

```typescript
isCriticalError(ErrorCodes.SECURITY_BRUTE_FORCE);  // true
```

---

#### `isRetryableError(code)`

**Açıklama:** Hatanın tekrar denenebilir olup olmadığını kontrol eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `code` | `ErrorCode` | Hata kodu |

**Dönüş:** `boolean`

**Retryable kodlar:** `DB_CONNECTION_FAILED`, `DB_CONNECTION_TIMEOUT`, `DB_QUERY_TIMEOUT`, `DB_DEADLOCK`, `CACHE_CONNECTION_FAILED`, `QUEUE_CONNECTION_FAILED`, `NETWORK_CONNECTION_FAILED`, `NETWORK_TIMEOUT`, `EXTERNAL_API_TIMEOUT`, `EXTERNAL_SERVICE_UNAVAILABLE`, `EXTERNAL_CIRCUIT_BREAKER_OPEN`

```typescript
isRetryableError(ErrorCodes.DB_CONNECTION_FAILED);  // true
```

---

#### `shouldAuditError(code)`

**Açıklama:** Hatanın audit log'una kaydedilip kaydedilmeyeceğini belirler (severity >= ERROR).

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `code` | `ErrorCode` | Hata kodu |

**Dönüş:** `boolean`

```typescript
shouldAuditError(ErrorCodes.INTERNAL_ERROR);  // true
shouldAuditError(ErrorCodes.NOT_FOUND);       // false
```

---


## 📚 Types

### common.types

```typescript
import type {
  PaginationOptions,
  PaginatedResult,
  ChangesMap,
  ApiResponse,
  ApiError,
  Timestamps,
  Status,
  AuditMetadata,
  DatabaseConfig,
  RedisConfig,
  SerializationOptions,
} from '@aegis/core';
```

#### `PaginationOptions`

**Açıklama:** Sayfalama sorguları için giriş parametreleri.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `page` | `number` | İstenen sayfa numarası (1-indexed, varsayılan: 1) |
| `pageSize` | `number` | Sayfa başına kayıt sayısı (varsayılan: `DEFAULT_PAGE_SIZE`) |
| `sort` | `string[]` | Sıralama kriterleri (`["-createdAt", "+name"]`) |

**Kullanım:**
```typescript
const options: PaginationOptions = {
  page: 2,
  pageSize: 50,
  sort: ['-createdAt', '+name'],
};
```

---

#### `PaginatedResult<T>`

**Açıklama:** Sayfalanmış veri yanıtı (generic — her entity için kullanılabilir).

| Alan | Tip | Açıklama |
|------|-----|----------|
| `data` | `T[]` | İstenen sayfadaki kayıtlar |
| `total` | `number` | Filtreye uyan toplam kayıt sayısı |
| `page` | `number` | Mevcut sayfa numarası |
| `pageSize` | `number` | Sayfa başına kayıt sayısı |
| `hasMore` | `boolean` | Sonraki sayfa var mı? (UI'da "daha fazla yükle" için) |

**Kullanım:**
```typescript
const result: PaginatedResult<User> = {
  data: [...],
  total: 250,
  page: 1,
  pageSize: 20,
  hasMore: true,
};
```

---

#### `ChangesMap`

**Açıklama:** İki obje arasındaki değişiklikleri tutan map. `diffChanges()` çıktısıdır.

```typescript
type ChangesMap = Record<string, { old: any; new: any }>;
```

**Kullanım:**
```typescript
const changes: ChangesMap = {
  age: { old: 25, new: 26 },
  email: { old: 'a@a.com', new: 'b@b.com' },
};
```

---

#### `ApiResponse<T>`

**Açıklama:** Tüm API yanıtları için standart sarmalayıcı (wrapper).

| Alan | Tip | Açıklama |
|------|-----|----------|
| `success` | `boolean` | İşlem başarılı mı? |
| `data` | `T` (opsiyonel) | Başarılı yanıt gövdesi |
| `error` | `ApiError` (opsiyonel) | Hata durumunda detaylar |
| `metadata` | `Record<string, any>` (opsiyonel) | Ek bilgiler (requestId, processingTime) |
| `timestamp` | `Date` | Yanıtın oluşturulma zamanı |

**Kullanım:**
```typescript
const response: ApiResponse<User> = {
  success: true,
  data: user,
  timestamp: new Date(),
};
```

---

#### `ApiError`

**Açıklama:** API hata yanıtı detayı.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `code` | `string` | Hata kodu (`ErrorCodes`'tan) |
| `message` | `string` | Kullanıcı dostu hata mesajı |
| `details` | `Record<string, any>` (opsiyonel) | Teknik detaylar |
| `path` | `string[]` (opsiyonel) | Hatanın kaynaklandığı alan (`["body", "email"]`) |

**Kullanım:**
```typescript
const error: ApiError = {
  code: 'VALIDATION_ERROR',
  message: 'Email geçersiz',
  path: ['body', 'email'],
};
```

---

#### `Timestamps`

**Açıklama:** Tüm veritabanı modellerine eklenen standart zaman damgaları.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `createdAt` | `Date` | Kayıt oluşturulma zamanı (immutable) |
| `updatedAt` | `Date` | Son güncellenme zamanı |
| `deletedAt` | `Date` (opsiyonel) | Soft-delete zamanı (dolu ise silinmiş) |

**Kullanım:**
```typescript
interface User extends Timestamps {
  id: string;
  email: string;
}
```

---

#### `Status`

**Açıklama:** Genel durum makinesi (state machine) için statüler.

```typescript
type Status = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
```

| Değer | Açıklama |
|-------|----------|
| `pending` | İşlem başlatıldı, sonuç bekleniyor |
| `active` | İşlem devam ediyor |
| `completed` | İşlem başarıyla tamamlandı |
| `failed` | İşlem başarısız oldu |
| `cancelled` | İşlem iptal edildi |

---

#### `AuditMetadata`

**Açıklama:** Audit log'ları için bağlamsal metadata.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `ipAddress` | `string` (opsiyonel) | İsteğin geldiği IP adresi |
| `userAgent` | `string` (opsiyonel) | İstemci bilgisi |
| `correlationId` | `string` (opsiyonel) | İstek zinciri takip ID'si (trace-id) |
| `metadata` | `Record<string, any>` (opsiyonel) | Esnek ek bilgiler |

**Kullanım:**
```typescript
const meta: AuditMetadata = {
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
  correlationId: 'trace-abc',
};
```

---

#### `DatabaseConfig`

**Açıklama:** Veritabanı bağlantı yapılandırması.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `host` | `string` | Veritabanı sunucu adresi |
| `port` | `number` | Bağlantı portu (PostgreSQL: 5432, MySQL: 3306) |
| `database` | `string` | Hedef veritabanı adı |
| `username` | `string` | Veritabanı kullanıcı adı |
| `password` | `string` | Veritabanı şifresi |
| `ssl` | `boolean` (opsiyonel) | SSL/TLS bağlantısı zorunlu mu? |
| `poolSize` | `number` (opsiyonel) | Bağlantı havuzu maksimum boyutu |

**Kullanım:**
```typescript
const dbConfig: DatabaseConfig = {
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  username: 'postgres',
  password: 'secret',
  ssl: true,
  poolSize: 10,
};
```

---

#### `RedisConfig`

**Açıklama:** Redis/Önbellek bağlantı yapılandırması.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `host` | `string` | Redis sunucu adresi |
| `port` | `number` | Redis portu (varsayılan: 6379) |
| `password` | `string` (opsiyonel) | Redis şifresi (AUTH) |
| `db` | `number` (opsiyonel) | Redis veritabanı indeksi (0-15) |
| `keyPrefix` | `string` (opsiyonel) | Key öneki (ortam izolasyonu için) |

**Kullanım:**
```typescript
const redisConfig: RedisConfig = {
  host: 'localhost',
  port: 6379,
  password: 'secret',
  db: 0,
  keyPrefix: 'app:prod:',
};
```

---

#### `SerializationOptions`

**Açıklama:** JSON serileştirme/deserileştirme opsiyonları.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `pretty` | `boolean` (opsiyonel) | Formatlı/okunaklı JSON çıktısı |
| `maxDepth` | `number` (opsiyonel) | Maksimum nesne derinliği (circular koruması) |

**Kullanım:**
```typescript
const options: SerializationOptions = {
  pretty: true,
  maxDepth: 5,
};
```

---

### errors.types

```typescript
import type {
  AppErrorType,
  ErrorContext,
  LogLevel,
  LoggerOptions,
  BackoffOptions,
} from '@aegis/core';
```

#### `AppErrorType`

**Açıklama:** Uygulama genelinde kullanılan normalize edilmiş hata yapısı (`AppError` sınıfının interface karşılığı).

| Alan | Tip | Açıklama |
|------|-----|----------|
| `code` | `ErrorCode` | Sistem hata kodu |
| `message` | `string` | Kullanıcı dostu hata mesajı |
| `statusCode` | `number` | HTTP durum kodu |
| `severity` | `ErrorSeverity` | Hata önem seviyesi |
| `details` | `Record<string, any>` (opsiyonel) | Teknik detaylar |
| `originalError` | `Error` (opsiyonel) | Wrap edilmiş orijinal hata |
| `isOperational` | `boolean` | Operasyonel hata mı? (false = programlama hatası) |
| `timestamp` | `string` | Hata oluşma zamanı (ISO 8601) |

**Kullanım:**
```typescript
const err: AppErrorType = {
  code: 'NOT_FOUND',
  message: 'User not found',
  statusCode: 404,
  severity: 2,
  isOperational: true,
  timestamp: new Date().toISOString(),
};
```

---

#### `ErrorContext`

**Açıklama:** Hata yakalandığında eklenen bağlamsal bilgiler (logger ve audit tarafından kullanılır).

| Alan | Tip | Açıklama |
|------|-----|----------|
| `userId` | `string` (opsiyonel) | Hatayı tetikleyen kullanıcı ID'si |
| `requestId` | `string` (opsiyonel) | HTTP istek ID'si (trace-id) |
| `operation` | `string` (opsiyonel) | Hangi işlem sırasında oldu? |
| `metadata` | `Record<string, any>` (opsiyonel) | Esnek ek veri |
| `source` | `string` (opsiyonel) | Hatanın kaynağı (PaymentService vb.) |

**Kullanım:**
```typescript
const context: ErrorContext = {
  userId: 'user-123',
  requestId: 'trace-abc',
  operation: 'createOrder',
  source: 'PaymentService',
};
```

---

#### `LogLevel`

**Açıklama:** Logger çıktı seviyeleri (Winston uyumlu).

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
```

| Değer | Açıklama |
|-------|----------|
| `debug` | Geliştirme detayları (sadece dev ortamında) |
| `info` | Bilgilendirme (normal operasyon) |
| `warn` | Uyarı (potansiyel sorun) |
| `error` | Hata (işlem başarısız) |

---

#### `LoggerOptions`

**Açıklama:** Logger oluşturma opsiyonları. **Not:** `src/types/errors.types.ts` ve `src/utils/logger.ts` içinde iki farklı tanım var. Runtime'da `utils/logger.ts`'teki kullanılır.

```typescript
type LoggerOptions = {
  level?: LogLevel;
  format?: 'json' | 'pretty';
  service?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
};
```

| Alan | Tip | Açıklama |
|------|-----|----------|
| `level` | `LogLevel` (opsiyonel) | Minimum log seviyesi |
| `format` | `'json' \| 'pretty'` (opsiyonel) | Çıktı formatı |
| `service` | `string` (opsiyonel) | Servis adı |
| `enableConsole` | `boolean` (opsiyonel) | Konsola yazdırma |
| `enableFile` | `boolean` (opsiyonel) | Dosyaya yazma |

---

#### `BackoffOptions`

**Açıklama:** Retry mekanizması için backoff stratejisi.

```typescript
type BackoffOptions = {
  strategy: 'exponential' | 'fixed';
  delay?: number;
  multiplier?: number;
  maxDelay?: number;
  maxRetries?: number;
};
```

| Alan | Tip | Açıklama |
|------|-----|----------|
| `strategy` | `'exponential' \| 'fixed'` | Backoff stratejisi |
| `delay` | `number` (opsiyonel) | Başlangıç gecikmesi (ms) |
| `multiplier` | `number` (opsiyonel) | Exponential için çarpan |
| `maxDelay` | `number` (opsiyonel) | Maksimum gecikme (ms) |
| `maxRetries` | `number` (opsiyonel) | Maksimum deneme sayısı |

**Kullanım:**
```typescript
const backoff: BackoffOptions = {
  strategy: 'exponential',
  delay: 1000,
  multiplier: 2,
  maxDelay: 30000,
  maxRetries: 5,
};
```

---

## ❌ Errors

### `AppError`

**Açıklama:** Framework'ün **tek hata sınıfı**. Tüm paketler bunu kullanır. `Error` sınıfından türetilmiştir.

**Constructor:**
```typescript
new AppError(options: AppErrorOptions)
```

#### `AppErrorOptions`

| Alan | Tip | Açıklama |
|------|-----|----------|
| `code` | `ErrorCode` | Hata kodu (`ErrorCodes`'tan, **zorunlu**) |
| `message` | `string` (opsiyonel) | Hata mesajı (belirtilmezse `code` kullanılır) |
| `statusCode` | `number` (opsiyonel) | HTTP durum kodu (belirtilmezse `HTTP_STATUS_MAP`'ten alınır) |
| `severity` | `ErrorSeverity` (opsiyonel) | Önem seviyesi (belirtilmezse `ERROR_SEVERITY_MAP`'ten alınır) |
| `details` | `Record<string, any>` (opsiyonel) | Ek hata detayları |
| `originalError` | `Error` (opsiyonel) | Wrap edilmiş orijinal hata |
| `isOperational` | `boolean` (opsiyonel) | Operasyonel mi? (varsayılan: `true`) |

#### Public Alanlar

| Alan | Tip | Açıklama |
|------|-----|----------|
| `code` | `ErrorCode` | Makine tarafından okunabilir hata kodu |
| `statusCode` | `number` | HTTP yanıt kodu |
| `severity` | `ErrorSeverity` | Önem seviyesi |
| `details` | `Record<string, any>` (opsiyonel) | Ek detaylar |
| `originalError` | `Error` (opsiyonel) | Zincirlenmiş orijinal hata |
| `isOperational` | `boolean` | Operasyonel hata mı? |
| `timestamp` | `string` | Hata oluşma zamanı (ISO 8601) |

**Kullanım:**
```typescript
import { AppError } from '@aegis/core';

// Basit
throw new AppError({
  code: 'NOT_FOUND',
  message: 'User not found',
});

// Detaylı
throw new AppError({
  code: 'VALIDATION_ERROR',
  message: 'Geçersiz veri',
  statusCode: 400,
  details: { field: 'email' },
  isOperational: true,
});
```

#### Yardımcı Metodlar

##### `isCritical(): boolean`

Hatanın kritik seviyede olup olmadığını döner (`severity === CRITICAL`).

```typescript
const err = new AppError({ code: 'CRITICAL_OUT_OF_MEMORY' });
err.isCritical();  // true
```

##### `isRetryable(): boolean`

Hatanın tekrar denenebilir olup olmadığını döner.

```typescript
const err = new AppError({ code: 'DB_CONNECTION_FAILED' });
err.isRetryable();  // true
```

##### `shouldAudit(): boolean`

Hatanın audit log'una yazılması gerekip gerekmediğini döner (`severity >= ERROR`).

```typescript
const err = new AppError({ code: 'INTERNAL_ERROR' });
err.shouldAudit();  // true
```

##### `toJSON(): Record<string, any>`

Hatayı JSON formatına dönüştürür (API yanıtı ve loglama için).

```typescript
const err = new AppError({ code: 'NOT_FOUND' });
err.toJSON();
// { name, code, message, statusCode, severity, timestamp, isOperational, details }
```

#### Static Factory Metodlar

Kısa yoldan hata oluşturmak için:

| Metod | Kod | Status |
|-------|-----|--------|
| `AppError.internal(message?, details?)` | `INTERNAL_ERROR` | 500 |
| `AppError.notFound(resource?, details?)` | `NOT_FOUND` | 404 |
| `AppError.validation(message?, details?)` | `VALIDATION_ERROR` | 422 |
| `AppError.unauthorized(message?, details?)` | `UNAUTHORIZED` | 401 |
| `AppError.forbidden(message?, details?)` | `FORBIDDEN` | 403 |
| `AppError.conflict(message?, details?)` | `CONFLICT` | 409 |
| `AppError.tooManyRequests(message?, details?)` | `TOO_MANY_REQUESTS` | 429 |

**Kullanım:**
```typescript
throw AppError.notFound('User');           // 404
throw AppError.unauthorized('Token expired'); // 401
throw AppError.conflict('Email exists');   // 409
```

---

### `ValidationError`

**Açıklama:** `AppError`'dan türeyen özelleştirilmiş doğrulama hatası. `@aegis/validation` paketi bunu kullanır.

**Constructor:**
```typescript
new ValidationError(message?: string, validationErrors?: ValidationErrorItem[])
```

#### `ValidationErrorItem`

| Alan | Tip | Açıklama |
|------|-----|----------|
| `path` | `string` | Hatanın oluştuğu alan (`'user.email'`, `'body.password'`) |
| `message` | `string` | İnsan tarafından okunabilir hata mesajı |
| `code` | `string` | Makine tarafından okunabilir kod (`'invalid_email'`) |

#### Public Alanlar

| Alan | Tip | Açıklama |
|------|-----|----------|
| `validationErrors` | `ValidationErrorItem[]` | Validasyon hatalarının listesi |

**Kullanım:**
```typescript
import { ValidationError } from '@aegis/core';

throw new ValidationError('Geçersiz veri', [
  { path: 'email', message: 'Geçersiz email formatı', code: 'INVALID_EMAIL' },
  { path: 'age', message: '18 yaşından küçük olamaz', code: 'TOO_YOUNG' },
]);
```

#### Yardımcı Metodlar

##### `getErrorPaths(): string[]`

Hatalı alanların isimlerini döner.

```typescript
err.getErrorPaths();  // ['email', 'age']
```

##### `hasError(path): boolean`

Belirli bir alanda hata var mı kontrol eder.

```typescript
err.hasError('email');  // true
```

##### `getError(path): ValidationErrorItem | undefined`

Belirli bir alandaki ilk hatayı döner.

```typescript
err.getError('email');
// { path: 'email', message: '...', code: '...' }
```

##### `getSummary(): string`

Tüm hata mesajlarını tek string'de birleştirir.

```typescript
err.getSummary();
// 'email: Geçersiz email formatı; age: 18 yaşından küçük olamaz'
```

##### `toJSON(): Record<string, any>`

`AppError.toJSON()`'u override eder ve `validationErrors` alanını ekler.

```typescript
err.toJSON();
// { ...AppError JSON, validationErrors: [...] }
```

---


## 🔧 Utils

### `logger` & `createLogger`

**Açıklama:** Winston tabanlı, Elasticsearch destekli logger. Otomatik hassas veri maskeleme içerir.

**Dosya:** `src/utils/logger.ts`

#### Tipler

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type Logger = {
  info: (message: string, meta?: Record<string, any>) => void;
  error: (message: string, error?: Error, meta?: Record<string, any>) => void;
  warn: (message: string, meta?: Record<string, any>) => void;
  debug: (message: string, meta?: Record<string, any>) => void;
  child: (meta: Record<string, any>) => Logger;
};

type LoggerOptions = {
  level?: LogLevel;
  format?: 'json' | 'pretty';
  logDir?: string;
  maxFiles?: number;
  maxSize?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  enableElasticsearch?: boolean;
  elasticsearchNode?: string;
  elasticsearchIndex?: string;
};
```

---

#### `createLogger(name, options?)`

**Açıklama:** İsimlendirilmiş bir logger instance'ı oluşturur.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `name` | `string` | — | Logger adı (log'da `service` alanında görünür) |
| `options.level` | `LogLevel` | `'info'` | Minimum log seviyesi |
| `options.format` | `'json' \| 'pretty'` | `'pretty'` | Çıktı formatı |
| `options.logDir` | `string` | `process.cwd()/logs` | Log dosyalarının dizini |
| `options.maxFiles` | `number` | `5` | Maksimum log dosyası sayısı (rotasyon) |
| `options.maxSize` | `string` | `'10mb'` | Maksimum dosya boyutu |
| `options.enableConsole` | `boolean` | `true` | Konsola yazdır |
| `options.enableFile` | `boolean` | `true` | Dosyaya yaz |
| `options.enableElasticsearch` | `boolean` | `NODE_ENV=production` ise `true` | Elasticsearch'e gönder |
| `options.elasticsearchNode` | `string` | `ELASTICSEARCH_URL` env | ES URL |
| `options.elasticsearchIndex` | `string` | `aegis-logs` | ES index öneki |

**Dönüş:** `Logger`

**Davranış:**
- `NODE_ENV=production` veya `ELASTICSEARCH_ENABLED=true` ise Elasticsearch transport otomatik eklenir
- `winston-elasticsearch` paketi yüklü değilse sessizce geçer (hata fırlatmaz)
- Tüm `meta` objeleri `maskSensitiveData` ile filtrelenir (hassas alanlar `[REDACTED]` olur)
- `child(meta)` ile alt logger oluşturulabilir

**Kullanım:**
```typescript
import { createLogger } from '@aegis/core';

const log = createLogger('UserService', { level: 'debug' });

log.info('Kullanıcı oluşturuldu', { userId: '123' });
log.error('DB hatası', new Error('timeout'), { operation: 'insert' });
log.warn('Rate limit yaklaşıyor');
log.debug('Debug mesajı');

const childLog = log.child({ requestId: 'req-abc' });
childLog.info('Child logger mesajı');
```

---

#### `logger`

**Açıklama:** Framework genelinde kullanılan hazır default logger instance'ı (`createLogger('aegis')`).

**Dönüş:** `Logger`

**Kullanım:**
```typescript
import { logger } from '@aegis/core';

logger.info('Sunucu başladı');
logger.error('Kritik hata', new Error('DB timeout'));
logger.warn('Disk kullanımı %90');
```

---

### `handleError`

**Açıklama:** Yakalanan hatayı standardize eder, log'lar ve güvenli yanıt formatına dönüştürür.

**Dosya:** `src/utils/error-handler.ts`

#### `handleError(error, context?)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `error` | `Error` | Yakalanan hata |
| `context.userId` | `string` | Kullanıcı ID |
| `context.requestId` | `string` | Request ID |
| `context.operation` | `string` | İşlem adı |
| `context.metadata` | `Record<string, any>` | Ek metadata |
| `context.source` | `string` | Hatanın kaynağı |

**Dönüş:** `AppErrorType` (normalize edilmiş hata objesi)

**Davranış:**
- `AppError` ise → kodu, mesajı, severity'sini korur
- Standart `Error` ise → `INTERNAL_ERROR` olarak işaretler
- **Production'da:** internal detayları (stack, details) gizler, sadece 4xx hataların mesajını gösterir
- **Development'da:** tüm detayları gösterir (stack trace dahil)
- Hata `logger.error()` ile otomatik loglanır

**Kullanım:**
```typescript
import { handleError } from '@aegis/core';

try {
  await someOperation();
} catch (error) {
  const handled = handleError(error as Error, {
    userId: 'user-123',
    operation: 'createOrder',
  });
  return res.status(handled.statusCode).json({ error: handled });
}
```

---

### `loadEnv`

**Açıklama:** `.env` dosyasını yükler ve parse edilmiş değişkenleri döner.

**Dosya:** `src/utils/env-loader.ts`

#### `loadEnv(envFilePath?)`

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `envFilePath` | `string` | `process.cwd()/.env` | `.env` dosya yolu |

**Dönüş:** `Record<string, string>` — Parse edilmiş değişkenler

**Hata Davranışı:**
- Dosya yoksa → `{}` döner (hata fırlatmaz, dev ortamında uyarı basar)
- Dosya bozuksa → `Error` fırlatır
- Development'ta hangi key'lerin yüklendiğini loglar (hassas alanlar filtrelenir)

**Kullanım:**
```typescript
import { loadEnv } from '@aegis/core';

const env = loadEnv('.env.local');
console.log(env.DATABASE_URL);
```

---

### `delay`

**Açıklama:** Belirtilen süre kadar asenkron bekler (sleep).

**Dosya:** `src/utils/common-helpers.ts`

#### `delay(ms)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `ms` | `number` | Beklenecek süre (milisaniye) |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
import { delay } from '@aegis/core';

await delay(2000); // 2 saniye bekle
```

---

### `toJSON`

**Açıklama:** Nesneyi güvenli bir şekilde JSON string'e dönüştürür. Circular reference, BigInt, Symbol, Date, RegExp, Map, Set gibi özel tipleri işler.

**Dosya:** `src/utils/common-helpers.ts`

#### `toJSON(data, options?)`

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `data` | `any` | — | Dönüştürülecek veri |
| `options.pretty` | `boolean` | `false` | Formatlı çıktı |
| `options.maxDepth` | `number` | `Infinity` | Maksimum nesne derinliği |

**Dönüş:** `string` — JSON string

**Davranış:**
- Circular reference → `"[Circular]"`
- BigInt / Symbol → string'e çevrilir
- Date → ISO 8601 string
- RegExp → string
- Map → plain object
- Set → array
- `toJSON()` metodu olan objeler → o metodu kullanır
- Max depth aşılırsa → `"[MaxDepth Reached]"`
- Hata durumunda → hata bilgisini JSON olarak döner (throw etmez)

**Kullanım:**
```typescript
import { toJSON } from '@aegis/core';

const obj: any = { name: 'Ali', age: 25 };
obj.self = obj; // circular reference

toJSON(obj);                    // '{"name":"Ali","age":25,"self":"[Circular]"}'
toJSON(obj, { pretty: true });  // Formatlı JSON
toJSON(obj, { maxDepth: 2 });   // Derinlik sınırlı
```

---

### `generateId`

**Açıklama:** Prefix'li veya prefix'siz unique ID üretir. `crypto.randomUUID()` kullanır.

**Dosya:** `src/utils/id-generator.ts`

#### `generateId(prefix?, length?)`

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `prefix` | `string` | — | ID öneki |
| `length` | `number` | `12` | ID uzunluğu (maksimum: 32) |

**Dönüş:** `string`

**Davranış:**
- `crypto.randomUUID()`'den tire işaretleri kaldırılır, `length` kadar kesilir
- `length` maksimum 32'ye sınırlıdır
- Prefix varsa `prefix_id` formatında döner

**Kullanım:**
```typescript
import { generateId } from '@aegis/core';

generateId()            // 'a1b2c3d4e5f6'
generateId('user')      // 'user_a1b2c3d4e5f6'
generateId('order', 16) // 'order_a1b2c3d4e5f6a7b8'
```

---

### `generateUUID`

**Açıklama:** Standart UUID v4 üretir (RFC 4122 uyumlu).

**Dosya:** `src/utils/id-generator.ts`

#### `generateUUID()`

**Dönüş:** `string` — UUID v4

**Kullanım:**
```typescript
import { generateUUID } from '@aegis/core';

generateUUID(); // '550e8400-e29b-41d4-a716-446655440000'
```

---

### `retry`

**Açıklama:** Başarısız async fonksiyonları belirtilen backoff stratejisiyle tekrar dener.

**Dosya:** `src/utils/retry.ts`

#### Tipler

```typescript
type RetryOptions = {
  maxRetries?: number;
  delay?: number;
  backoffStrategy?: 'exponential' | 'linear' | 'fixed';
  onRetry?: (attempt: number, error: Error) => void;
};
```

| Alan | Tip | Default | Açıklama |
|------|-----|---------|----------|
| `maxRetries` | `number` | `3` | Maksimum deneme sayısı |
| `delay` | `number` | `1000` | Base bekleme süresi (ms) |
| `backoffStrategy` | `'exponential' \| 'linear' \| 'fixed'` | `'exponential'` | Bekleme stratejisi |
| `onRetry` | `(attempt, error) => void` | — | Her retry'de çağrılan callback |

#### `retry(fn, options?)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `fn` | `() => Promise<T>` | Çalıştırılacak async fonksiyon |
| `options` | `RetryOptions` | Retry konfigürasyonu |

**Dönüş:** `Promise<T>` — Fonksiyonun başarılı sonucu

**Hata Davranışı:**
- Son denemede de başarısız olursa orijinal hatayı fırlatır
- Her başarısız denemede `logger.warn()` ile loglar

**Backoff stratejileri:**
- `exponential`: 1s, 2s, 4s, 8s... (her denemede 2 kat artar)
- `linear`: 1s, 2s, 3s, 4s... (her denemede sabit miktar artar)
- `fixed`: 1s, 1s, 1s, 1s... (her denemede aynı süre)

**Kullanım:**
```typescript
import { retry } from '@aegis/core';

// Basit
const data = await retry(() => fetchData());

// Özelleştirilmiş
const data = await retry(() => fetchData(), {
  maxRetries: 5,
  delay: 2000,
  backoffStrategy: 'linear',
  onRetry: (attempt, error) => {
    console.warn(`Retry ${attempt}: ${error.message}`);
  },
});
```

> ⚠️ **Not:** Production kodunda `@aegis/resilience` paketinin `executeWithRetry()` fonksiyonu tercih edilmelidir. Bu fonksiyon core'un dahili/basit ihtiyaçları içindir.

---

### `maskSensitiveData`

**Açıklama:** Verilen obje içindeki hassas alanları `[REDACTED]` yapar. Token-based match kullanır.

**Dosya:** `src/utils/mask-helpers.ts`

#### `DEFAULT_SENSITIVE_FIELDS`

**Açıklama:** Varsayılan hassas alan listesi (20 alan, token-based match).

```typescript
const DEFAULT_SENSITIVE_FIELDS = [
  // Kimlik doğrulama
  'password', 'passwd', 'pwd',
  'secret', 'token', 'apiKey', 'privateKey',
  'authorization', 'auth',
  // Finansal
  'creditCard', 'card', 'cvv', 'cvc',
  'iban', 'accountNumber',
  // Kişisel (PII)
  'ssn', 'passport', 'nationalId',
  // Genel
  'key', 'credential',
] as const;
```

#### `maskSensitiveData(data, sensitiveFields?)`

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `data` | `any` | — | Maskelenecek veri |
| `sensitiveFields` | `readonly string[]` | `DEFAULT_SENSITIVE_FIELDS` | Ek hassas alan listesi |

**Dönüş:** `any` — Maskelenmiş veri (yeni obje, orijinal mutasyona uğramaz)

**Davranış:**
- **Token-based match:** Alan adı camelCase/snake_case/kebab-case/PascalCase sınırlarından token'lara ayrılır ve her token listeyle karşılaştırılır
  - `userPassword` → `['user', 'password']` → eşleşir ✅
  - `api_key` → `['api', 'key']` → eşleşir ✅
  - `monkey` → `['monkey']` → eşleşmez ✅
  - `author` → `['author']` → eşleşmez ✅
- **Recursive:** Nested objeler ve array'lerin içindeki objeler de işlenir
- `Date` ve `RegExp` özel objeler → olduğu gibi döner
- `null` / `undefined` / primitive → olduğu gibi döner

**Kullanım:**
```typescript
import { maskSensitiveData } from '@aegis/core';

// Basit
maskSensitiveData({ password: 'x', name: 'Ali' });
// { password: '[REDACTED]', name: 'Ali' }

// Nested
maskSensitiveData({ user: { apiKey: 'abc', id: 1 } });
// { user: { apiKey: '[REDACTED]', id: 1 } }

// Ek alanlarla
maskSensitiveData(data, [...DEFAULT_SENSITIVE_FIELDS, 'jwtSecret']);
```

---

### `diffChanges`

**Açıklama:** İki obje arasındaki farkı çıkarır. Sadece değişen alanları döner.

**Dosya:** `src/utils/diff-helpers.ts`

#### `diffChanges(oldData, newData, excludeFields?)`

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `oldData` | `any` | — | Eski veri |
| `newData` | `any` | — | Yeni veri |
| `excludeFields` | `string[]` | `[]` | Hariç tutulacak alanlar |

**Dönüş:** `ChangesMap` — `Record<string, { old: any; new: any }>`

**Davranış:**
- Sadece **değişen** alanlar döner (aynı olanlar atlanır)
- Nested objelerde **shallow diff** yapar (üst seviye alan bazında karşılaştırma)
- `excludeFields` listesindeki alanlar görmezden gelinir
- Yeni eklenen alanlar: `{ old: undefined, new: value }`
- Silinen alanlar: `{ old: value, new: undefined }`
- Date → `getTime()` karşılaştırması
- Array → uzunluk + eleman karşılaştırması
- Object → `JSON.stringify` karşılaştırması

**Kullanım:**
```typescript
import { diffChanges } from '@aegis/core';

diffChanges(
  { name: 'Ali', age: 25 },
  { name: 'Ali', age: 26 },
);
// { age: { old: 25, new: 26 } }

diffChanges(
  { a: 1, b: 2 },
  { a: 1, b: 3 },
  ['a'], // a hariç
);
// { b: { old: 2, new: 3 } }
```

---

### `formatChangesSummary`

**Açıklama:** `diffChanges` çıktısını okunabilir tek satır özet yapar.

**Dosya:** `src/utils/diff-helpers.ts`

#### `formatChangesSummary(changes, maxLength?)`

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `changes` | `ChangesMap` | — | `diffChanges()` çıktısı |
| `maxLength` | `number` | `200` | Maksimum karakter uzunluğu |

**Dönüş:** `string`

**Davranış:**
- Format: `field: old → new; field2: old2 → new2`
- `maxLength` aşılırsa `...` ile keser
- Obje/array değerler `JSON.stringify` ile kısaltılır (max 50 karakter)

**Kullanım:**
```typescript
import { formatChangesSummary } from '@aegis/core';

formatChangesSummary({ age: { old: 25, new: 26 } });
// 'age: 25 → 26'

formatChangesSummary({
  a: { old: 1, new: 2 },
  b: { old: 3, new: 4 },
});
// 'a: 1 → 2; b: 3 → 4'
```

---

### `normalizePagination`

**Açıklama:** Sayfalama parametrelerini güvenli aralığa normalize eder.

**Dosya:** `src/utils/pagination-helpers.ts`

#### Tip

```typescript
type NormalizedPagination = {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
};
```

#### `normalizePagination(options?)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `options.page` | `number` | İstenen sayfa (1-indexed) |
| `options.pageSize` | `number` | Sayfa başına kayıt |
| `options.sort` | `string[]` | Sıralama kriterleri |

**Dönüş:** `NormalizedPagination` — `{ page, pageSize, offset, limit }`

**Davranış:**
- `page` yok veya < 1 ise → `1`
- `pageSize` yok veya < 1 ise → `DEFAULT_PAGE_SIZE` (20)
- `pageSize` > `MAX_PAGE_SIZE` (100) ise → `100`
- `offset` = `(page - 1) * pageSize`
- `limit` = `pageSize`

**Kullanım:**
```typescript
import { normalizePagination } from '@aegis/core';

normalizePagination();
// { page: 1, pageSize: 20, offset: 0, limit: 20 }

normalizePagination({ page: 3, pageSize: 50 });
// { page: 3, pageSize: 50, offset: 100, limit: 50 }

normalizePagination({ pageSize: 9999 });
// { page: 1, pageSize: 100, offset: 0, limit: 100 } // MAX_PAGE_SIZE ile sınırlandı
```

---

### `exportData`

**Açıklama:** Veriyi JSON / CSV / PDF formatında Buffer olarak döner.

**Dosya:** `src/utils/export-helpers.ts`

#### Tipler

```typescript
type ExportFormat = 'json' | 'csv' | 'pdf';

type ExportOptions = {
  filename?: string;
  columns?: string[];
  title?: string;
};
```

| Alan | Tip | Açıklama |
|------|-----|----------|
| `filename` | `string` | Dosya adı (PDF metadata için) |
| `columns` | `string[]` | Sadece bu kolonları dahil et |
| `title` | `string` | PDF için başlık |

#### `exportData(rows, format, options?)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `rows` | `any[]` | Export edilecek veri dizisi |
| `format` | `'json' \| 'csv' \| 'pdf'` | Çıktı formatı |
| `options` | `ExportOptions` | Export konfigürasyonu |

**Dönüş:** `Promise<Buffer>` — Dosyaya yazılabilir veya HTTP response'a verilebilir

**Hata Davranışı:**
- `rows` array değilse → `AppError` (`VALIDATION_ERROR`, 422)
- Bilinmeyen format → `AppError` (`VALIDATION_ERROR`, 422)

**Format detayları:**
- **json:** Pretty-printed JSON (2 space indent), UTF-8
- **csv:** RFC 4180 uyumlu (tırnak/virgül/yeni satır escape'li), UTF-8, header satırı ile
- **pdf:** PDFKit ile üretilmiş basit tablo (A4, margin 40, sayfa sonu otomatik)

**Kullanım:**
```typescript
import { exportData } from '@aegis/core';

// CSV
const csvBuffer = await exportData(users, 'csv');
fs.writeFileSync('users.csv', csvBuffer);

// PDF (başlıklı)
const pdfBuffer = await exportData(users, 'pdf', { title: 'Kullanıcı Listesi' });

// JSON (sadece belirli kolonlar)
const jsonBuffer = await exportData(users, 'json', { columns: ['id', 'email'] });

// HTTP response
res.setHeader('Content-Type', 'application/pdf');
res.send(pdfBuffer);
```

---


## 🏷️ Decorators

### `@Deprecated`

**Açıklama:** Bir metodun kullanımdan kaldırıldığını belirtir. Çağrıldığında otomatik `logger.warn` atar.

**Dosya:** `src/decorators/deprecated.decorator.ts`

#### `Deprecated(message?, version?)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `message` | `string` | Geliştiriciye gösterilecek yönlendirme mesajı |
| `version` | `string` | Hangi versiyonda deprecated olduğu |

**Dönüş:** `MethodDecorator`

**Davranış:**
- Orijinal metodu **proxy pattern** ile sarar (davranışı değiştirmez, sadece log ekler)
- Çağrıldığında `logger.warn` ile uyarı basar
- Log'a şu bilgiler eklenir:
  - `method`: Metod adı
  - `deprecatedSince`: Versiyon (veya `'unknown'`)
  - `className`: Sınıf adı
  - `timestamp`: Çağrı zamanı
- `this` bağlamı korunur

**Kullanım:**
```typescript
import { Deprecated } from '@aegis/core';

class UserService {
  @Deprecated('Use getUserV2() instead', '1.2.0')
  getUser(id: string) {
    // Bu metod çağrıldığında warning loglanır
  }

  getUserV2(id: string) {
    // Yeni implementasyon
  }
}
```

**Log çıktısı:**
```
[DEPRECATED] Use getUserV2() instead {
  method: 'getUser',
  deprecatedSince: '1.2.0',
  className: 'UserService',
  timestamp: '2024-01-15T10:30:00.000Z'
}
```

---

## 📊 Config & Defaults

### Environment Değişkenleri

| Env | Tip | Default | Açıklama |
|-----|-----|---------|----------|
| `NODE_ENV` | `string` | — | `development`, `production`, `test` |
| `LOG_LEVEL` | `'debug' \| 'info' \| 'warn' \| 'error'` | `'info'` | Minimum log seviyesi |
| `LOG_FORMAT` | `'json' \| 'pretty'` | `'pretty'` | Log çıktı formatı |
| `ELASTICSEARCH_ENABLED` | `'true' \| 'false'` | `'false'` | Elasticsearch aktif |
| `ELASTICSEARCH_URL` | `string` | `'http://localhost:9200'` | Elasticsearch URL |
| `ELASTICSEARCH_INDEX_PREFIX` | `string` | `'aegis-logs'` | ES index öneki |

### Sabit Değerler

| Sabit | Değer | Açıklama |
|-------|-------|----------|
| `APP_NAME` | `'AEGIS'` | Framework adı |
| `APP_VERSION` | `'0.1.0'` | Framework versiyonu |
| `AUDIT_DEFAULT_RETENTION_DAYS` | `90` | Audit log saklama süresi (gün) |
| `AUDIT_MAX_BATCH_SIZE` | `1000` | Max batch audit kaydı |
| `AUDIT_FLUSH_INTERVAL_MS` | `5000` | Audit buffer flush aralığı |
| `DEFAULT_PAGE_SIZE` | `20` | Varsayılan sayfa boyutu |
| `MAX_PAGE_SIZE` | `100` | Maksimum sayfa boyutu |
| `DEFAULT_CACHE_TTL` | `3600` | Varsayılan cache TTL (saniye) |
| `DEFAULT_RATE_LIMIT_WINDOW` | `60000` | Rate limit penceresi (ms) |
| `DEFAULT_RATE_LIMIT_MAX` | `100` | Rate limit max istek |

### Logger Default'ları

| Ayar | Default |
|------|---------|
| Level | `'info'` |
| Format | `'pretty'` |
| Console | `true` |
| File | `true` |
| Elasticsearch | `NODE_ENV=production` ise `true` |
| Log dizini | `process.cwd()/logs` |
| Max dosya boyutu | `'10mb'` |
| Max dosya sayısı | `5` |

### Retry Default'ları

| Ayar | Default |
|------|---------|
| `maxRetries` | `3` |
| `delay` | `1000` ms |
| `backoffStrategy` | `'exponential'` |

### Pagination Default'ları

| Ayar | Default |
|------|---------|
| `page` | `1` |
| `pageSize` | `20` |
| Max `pageSize` | `100` |

---

## 🔗 Kim Kullanıyor?

Framework'teki tüm paketler `@aegis/core`'a bağımlıdır. Delegasyon tablosu:

| Paket | Kullandığı Core Sembolleri |
|-------|----------------------------|
| `@aegis/audit` | `logger`, `AppError`, `generateAuditId`*, `diffChanges`, `formatChangesSummary`, `maskSensitiveData`, `exportData`, `normalizePagination` |
| `@aegis/observability` | `logger`, `AppError`, `generateId` |
| `@aegis/resilience` | `logger`, `AppError`, `retry`, `delay` |
| `@aegis/cache` | `logger`, `AppError`, `DEFAULT_CACHE_TTL` |
| `@aegis/validation` | `logger`, `ValidationError` |
| `@aegis/queue` | `logger`, `AppError`, `exportData` |
| `@aegis/security` | `logger`, `AppError`, `generateId`, `exportData` |
| `@aegis/migration` | `logger`, `AppError` |
| `@aegis/performance` | `logger`, `AppError` |
| `@aegis/testing` | `logger`, `generateId` |
| `@aegis/docs` | `logger`, `AppError` |
| `@aegis/cli` | (dolaylı - diğer paketler üzerinden) |
| `@aegis/starter-template` | `logger`, `AppError`, `generateId` |

> **NOT:** `generateAuditId` (bkz: `@aegis/audit` README) `@aegis/core`'da şu anda **mevcut değildir**. Audit paketi bunu kendi içinde tanımlayacak ya da `core`'a eklenecektir.

---

## 📝 Değişiklik Kayıtları

Aşağıdaki değişiklikler **orijinal `@aegis/core/README.md`'ye** göre yapılmıştır. Her biri gerekçesiyle birlikte listelenmiştir.

| # | Değişiklik | Gerekçe |
|---|-----------|---------|
| 1 | `AppError` imzası `(code, message, statusCode, details?)` → `(options: AppErrorOptions)` olarak düzeltildi | Gerçek kod tek obje parametre alıyor |
| 2 | `ErrorSeverity`, `ErrorCategory`, `AuditAction` eklendi | Kodda mevcut, README'de yoktu |
| 3 | `ERROR_SEVERITY_MAP`, `HTTP_STATUS_MAP`, `ERROR_CATEGORY_MAP` eklendi | Kodda mevcut, README'de yoktu |
| 4 | `getHttpStatus`, `getCategory`, `getSeverity`, `isCriticalError`, `isRetryableError`, `shouldAuditError` eklendi | Kodda mevcut, README'de yoktu |
| 5 | `AppError.isCritical()`, `isRetryable()`, `shouldAudit()`, `toJSON()` metodları eklendi | Kodda mevcut, README'de yoktu |
| 6 | `AppError` static factory'ler eklendi (`internal`, `notFound`, `validation`, `unauthorized`, `forbidden`, `conflict`, `tooManyRequests`) | Kodda mevcut, README'de yoktu |
| 7 | `ValidationError` metodları eklendi (`getErrorPaths`, `hasError`, `getError`, `getSummary`, `toJSON`) | Kodda mevcut, README'de yoktu |
| 8 | `ErrorCodes` tam liste (~70+ kod) olarak güncellendi | README'de sadece 9 kod vardı |
| 9 | `MAX_PAGE_SIZE` değeri `1000` → `100` olarak düzeltildi | Gerçek kod `100` |
| 10 | `HTTP_STATUS`'a `INTERNAL_SERVER_ERROR` eklendi, `INTERNAL_ERROR` kaldırıldı | Gerçek kodda `INTERNAL_SERVER_ERROR` var |
| 11 | `HTTP_STATUS`'tan `ACCEPTED (202)` ve `UNPROCESSABLE_ENTITY (422)` kaldırıldı | Gerçek kodda yok |
| 12 | `retry` backoffStrategy `'none'` → `'fixed'` olarak düzeltildi | Gerçek kod `'fixed'` kullanıyor |
| 13 | `retry`'ye `onRetry` callback'i eklendi | Kodda mevcut, README'de yoktu |
| 14 | `Logger.child()` metodu eklendi | Kodda mevcut, README'de yoktu |
| 15 | `LoggerOptions` tam liste (11 alan) olarak güncellendi | README'de 5 alan vardı |
| 16 | `maskSensitiveData`, `DEFAULT_SENSITIVE_FIELDS` eklendi (yeni yazıldı) | Audit ve observability'nin ihtiyacı |
| 17 | `diffChanges`, `formatChangesSummary` eklendi (yeni yazıldı) | Audit'in ihtiyacı |
| 18 | `normalizePagination` eklendi (yeni yazıldı) | Audit ve diğer paketlerin ihtiyacı |
| 19 | `exportData` eklendi (yeni yazıldı) | Audit, queue, security'nin ihtiyacı |
| 20 | `ChangesMap`, `NormalizedPagination`, `ExportFormat`, `ExportOptions` tipleri eklendi | Yeni fonksiyonlar için gerekli |
| 21 | `logger.ts`'teki `SENSITIVE_KEYS` + `sanitizeMeta` kaldırıldı → `maskSensitiveData` kullanılıyor | Tek doğruluk kaynağı (dedupe) |
| 22 | `pdfkit` bağımlılığı eklendi (`package.json`) | PDF export için gerekli |
| 23 | Harici Bağımlılıklar bölümü eklendi | Şeffaflık |
| 24 | Dosya Yapısı bölümü eklendi | Oriente olmayı kolaylaştırır |
| 25 | Naming Convention bölümü eklendi | `@aegis/observability` README'siyle uyumlu |

### Bilinen Sorunlar

| # | Sorun | Etki |
|---|-------|------|
| 1 | `src/errors/error-codes.ts` duplike (constants'takinin kopyası) | Dead code — kullanılmıyor, silinebilir |
| 2 | `LogLevel` ve `LoggerOptions` iki yerde tanımlı (`utils/logger.ts` + `types/errors.types.ts`) | İçerikleri farklı, çakışma riski |
| 3 | `package.json`'da `uuid` bağımlılığı var ama kod `crypto.randomUUID` kullanıyor | Kullanılmayan dependency |
| 4 | `@types/uuid` deprecated uyarısı | Bağımlılık temizliği gerekli |

---

## 📄 Lisans

MIT

---

**Built by engineers, for engineers. Production-ready from day one.**

🛡️ **AEGIS** — Enterprise-grade simplicity.