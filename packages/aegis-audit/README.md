# @aegis/audit

AEGIS framework'ünün **Audit Trail & GDPR Compliance** modülü.

---

## 🎯 Amaç

Production-ready microservices için:

- **Audit Trail** → Tüm veri değişikliklerini otomatik kaydetme
- **GDPR Compliance** → Veri silme, anonimleştirme, dışa aktarma
- **Soft Delete** → Kalıcı silme yerine geçici silme + geri getirme

---

## 📦 Kurulum

```bash
pnpm add @aegis/audit
```

---

## 🚀 Hızlı Başlangıç

### Initialize

```typescript
import { PrismaClient } from '@prisma/client';
import {
  initializeAudit,
  initializeSoftDelete,
  initializeAuditMiddleware,
  initializeGDPREngine,
  initializeSoftDeleteMiddleware,
} from '@aegis/audit';

const prisma = new PrismaClient();

initializeAudit(prisma);
initializeSoftDelete(prisma);
initializeAuditMiddleware(prisma);
initializeGDPREngine(prisma);
initializeSoftDeleteMiddleware(prisma);
```

### Express Middleware Kullanımı

```typescript
import express from 'express';
import {
  auditMiddleware,
  excludeFromAudit,
  softDeleteFilter,
  onlyDeletedFilter,
  gdprErasureHandler,
  gdprExportHandler,
} from '@aegis/audit';

const app = express();

// Tüm HTTP isteklerini otomatik log'la
app.use(auditMiddleware);

// Belirli endpoint'leri audit'ten hariç tut
app.use(excludeFromAudit(['/health', '/metrics']));

// Silinmiş kayıtları gizle (normal kullanıcılar için)
app.use(softDeleteFilter);

// Sadece silinmiş kayıtları göster (admin paneli için)
app.use('/admin', onlyDeletedFilter);

// GDPR endpoint'leri
app.delete('/api/gdpr/:userId', gdprErasureHandler);
app.get('/api/gdpr/:userId/export', gdprExportHandler);
```

---

## 📌 Decorator

### `@Audited()`

**Açıklama:** Bir metodun tüm çağrılarını otomatik olarak audit trail'a kaydeder. Veri değişikliklerini (CREATE, UPDATE, DELETE) takip eder. Who, What, When, Why bilgilerini loglar.

**Parametreler:**

```typescript
options?: {
  include?: string[]           // Hangi field'ları log'la (whitelist)
  exclude?: string[]           // Hangi field'ları log'lama (blacklist)
  trackDeletes?: boolean       // Delete işlemlerini track et (default: true)
  sensitive?: boolean          // Sensitive data handling (default: false)
  customFields?: Record<string, any> // Ekstra metadata ekle
}
```

**Dönüş:** `void` (Decorator, return type yok)

**Kullanım:**

```typescript
class UserService {
  @Audited({ exclude: ['password'] })
  async updateUser(id: string, data: UpdateUserDto) {
    // Password log'lanmaz
  }
}
```

**Initialize:**

```typescript
initializeAudit(prisma, ['customSensitiveField']);
```

### `@SoftDelete()`

**Açıklama:** Entity'yi kalıcı silmek yerine `deletedAt` işaretler. `SoftDeleteRegistry`'ye kaydeder ve audit log yazar.

**Kullanım:**

```typescript
class UserService {
  @SoftDelete()
  async deleteUser(id: string, context?: { userId?: string; reason?: string }) {
    // Soft delete yapılır
  }
}
```

**Initialize:**

```typescript
initializeSoftDelete(prisma, auditService);
```

---

## 📌 Middleware

### `auditMiddleware`
**Açıklama:** Tüm API isteklerini audit trail'e kaydeder. Hassas endpoint'leri (login, register) log'lamaz.

### `excludeFromAudit`
**Açıklama:** Belirli endpoint'leri audit'ten hariç tutar.

### `softDeleteFilter`
**Açıklama:** Soft-delete edilmiş kayıtları response'tan filtreler. Normal kullanıcılar silinmiş verileri görmez.

### `onlyDeletedFilter`
**Açıklama:** Sadece soft-delete edilmiş kayıtları gösterir. Admin paneli için.

### `gdprErasureHandler`
**Açıklama:** GDPR veri silme talebini işleyen Express handler.

### `gdprExportHandler`
**Açıklama:** GDPR veri dışa aktarma talebini işleyen Express handler.

---

## 📌 Services

### AuditTrailService

#### ✅ `createAuditLog()`
**Açıklama:** Yeni bir audit log entry'si oluşturur ve veritabanına kaydeder.

**Parametre:**
- `userId: string` → Hangi kullanıcı yaptı?
- `entityType: string` → Hangi entity'ye yapıldı?
- `action: 'CREATE' | 'UPDATE' | 'DELETE'` → Hangi işlem?
- `changes: Record<string, any>` → Ne değişti?
- `metadata?: AuditMetadata` → IP, User Agent, correlationId

**Dönüş:** `Promise<AuditLog>`

**Örnek:**

```typescript
await auditTrailService.createAuditLog(
  'user-123',
  'User',
  'UPDATE',
  { email: { old: 'old@email.com', new: 'new@email.com' } },
  { ipAddress: '192.168.1.1' }
)
```

#### ✅ `getAuditLogs()`
**Açıklama:** Audit log'ları filtreler, sıralar, sayfalar.

**Parametre:**
- `filters: AuditFilters`
- `pagination?: PaginationOptions`

**Dönüş:** `Promise<PaginatedAuditLogs>`

#### ✅ `getAuditLogById()`
**Açıklama:** ID ile spesifik audit log getirir.

**Parametre:** `auditLogId: string`

**Dönüş:** `Promise<AuditLog | null>`

#### ✅ `exportAuditTrail()`
**Açıklama:** Audit trail'ı PDF, CSV veya JSON formatında export eder.

**Parametre:** `filters: AuditFilters`, `format: 'pdf' | 'csv' | 'json'`

**Dönüş:** `Promise<Buffer>`

#### ✅ `getUserActivityHistory()`
**Açıklama:** Kullanıcının aktivitelerini kronolojik sırada getirir.

**Parametre:** `userId: string`, `options?: ActivityHistoryOptions`

**Dönüş:** `Promise<UserActivityLog[]>`

#### ✅ `getEntityHistory()`
**Açıklama:** Entity'nin tüm değişiklik geçmişini getirir.

**Parametre:** `entityType: string`, `entityId: string`

**Dönüş:** `Promise<AuditLog[]>`

#### ✅ `searchAuditLogs()`
**Açıklama:** Audit log'larda arama yapar.

**Parametre:** `query: string`, `filters?: AuditFilters`

**Dönüş:** `Promise<AuditLog[]>`

#### ✅ `retryFailedAuditLog()`
**Açıklama:** Başarısız log'u tekrar yazmayı dener.

**Parametre:** `auditLogId: string`

**Dönüş:** `Promise<boolean>`

#### ✅ `purgeOldAuditLogs()`
**Açıklama:** Belirli tarihten eski log'ları siler.

**Parametre:** `olderThan: Date`

**Dönüş:** `Promise<number>`

#### ✅ `getAuditLogByCorrelationId()`
**Açıklama:** Aynı correlationId'ye sahip log'ları getirir.

**Parametre:** `correlationId: string`

**Dönüş:** `Promise<AuditLog[]>`

#### ✅ `bulkCreateAuditLogs()`
**Açıklama:** Birden fazla log'u tek seferde yazar.

**Parametre:** `logs: BulkCreateAuditLogInput[]` (max: 1000)

**Dönüş:** `Promise<number>`

### GDPRDeletionService

#### ✅ `eraseUserData()`
**Açıklama:** Kullanıcı verilerini GDPR uyumlu siler.

**Parametre:** `userId: string`, `reason: string`

**Dönüş:** `Promise<GDPRErasureResult>`

#### ✅ `exportUserData()`
**Açıklama:** Kullanıcı verilerini dışa aktarır (right-to-data).

**Parametre:** `userId: string`, `format?: 'json' | 'csv'`

**Dönüş:** `Promise<UserDataExport>`

#### ✅ `anonymizeUserData()`
**Açıklama:** Kullanıcı verilerini anonimleştirir.

**Parametre:** `userId: string`, `fields: string[]`

**Dönüş:** `Promise<AnonymizationResult>`

#### ✅ `getCascadeDeletePlan()`
**Açıklama:** Silme öncesi cascade planını gösterir.

**Parametre:** `userId: string`

**Dönüş:** `Promise<CascadeDeletePlan>`

#### ✅ `verifyErasureCompletion()`
**Açıklama:** Silme işleminin tamamlandığını doğrular.

**Parametre:** `userId: string`

**Dönüş:** `Promise<ErasureVerification>`

#### ✅ `scheduleDataErasure()`
**Açıklama:** Veri silmeyi ileri tarihe planlar.

**Parametre:** `userId: string`, `scheduledAt: Date`, `reason: string`

**Dönüş:** `Promise<ScheduledErasure>`

#### ✅ `cancelScheduledErasure()`
**Açıklama:** Planlı silmeyi iptal eder.

**Parametre:** `userId: string`

**Dönüş:** `boolean`

### AuditReportService

#### ✅ `generateSummaryReport()`
**Açıklama:** Belirli dönem için özet rapor oluşturur. Tüm aksiyon, entity, kullanıcı ve günlük dağılımları içerir.

**Parametre:** `startDate: Date`, `endDate: Date`

**Dönüş:** `Promise<SummaryReport>`

#### ✅ `getMostActiveUsers()`
**Açıklama:** En aktif kullanıcıları getirir (aksiyon sayısına göre).

**Parametre:** `limit?: number` (default: 10, max: 100)

**Dönüş:** `Promise<ActiveUser[]>`

#### ✅ `getMostChangedEntities()`
**Açıklama:** En çok değişiklik yapılan entity tiplerini getirir.

**Parametre:** `limit?: number`

**Dönüş:** `Promise<ChangedEntity[]>`

#### ✅ `getFailedAuditLogs()`
**Açıklama:** Başarısız audit log kayıtlarını getirir.

**Parametre:** `limit?: number`

**Dönüş:** `Promise<FailedAuditLogEntry[]>`

#### ✅ `getHourlyActivity()`
**Açıklama:** Belirli bir günün saatlik aktivite dağılımını getirir.

**Parametre:** `date?: Date` (default: bugün)

**Dönüş:** `Promise<HourlyActivity>`

#### ✅ `getDailyActivity()`
**Açıklama:** Belirli dönem için günlük aktivite trendini getirir (CREATE, UPDATE, DELETE dağılımı).

**Parametre:** `startDate: Date`, `endDate: Date`

**Dönüş:** `Promise<DailyActivity[]>`

#### ✅ `getTopErrorMessages()`
**Açıklama:** En sık görülen hata mesajlarını getirir.

**Parametre:** `limit?: number`

**Dönüş:** `Promise<ErrorFrequency[]>`

#### ✅ `getUserActivityTimeline()`
**Açıklama:** Kullanıcının zaman içindeki aktivite paternini getirir.

**Parametre:** `userId: string`, `period: 'day' | 'week' | 'month'`

**Dönüş:** `Promise<ActivityTimeline>`

#### ✅ `getEntityChangeTrend()`
**Açıklama:** Entity'nin değişim sıklığı trendini getirir.

**Parametre:** `entityType: string`, `entityId: string`

**Dönüş:** `Promise<ChangeTrend>`

#### ✅ `exportReport()`
**Açıklama:** Belirli dönem raporunu JSON olarak dışa aktarır.

**Parametre:** `startDate: Date`, `endDate: Date`

**Dönüş:** `Promise<string>`

### SoftDeleteService

#### ✅ `softDelete()`
**Açıklama:** Entity'yi kalıcı silme yerine soft delete yapar. `SoftDeleteRegistry`'ye kaydeder ve audit log yazar.

**Parametre:**
- `entityType: string`
- `entityId: string`
- `deletedBy?: string`
- `reason?: string`

**Dönüş:** `Promise<SoftDeleteResult>`

#### ✅ `restore()`
**Açıklama:** Soft delete edilmiş entity'yi geri getirir.

**Parametre:** `entityType: string`, `entityId: string`

**Dönüş:** `Promise<RestoreResult>`

#### ✅ `hardDelete()`
**Açıklama:** Soft delete edilmiş entity'yi kalıcı olarak siler.

**Parametre:** `entityType: string`, `entityId: string`

**Dönüş:** `Promise<HardDeleteResult>`

#### ✅ `getSoftDeletedRecords()`
**Açıklama:** Silinen kayıtları listeler.

**Parametre:** `options?: SoftDeleteListOptions`

**Dönüş:** `Promise<SoftDeletedRecord[]>`

#### ✅ `isSoftDeleted()`
**Açıklama:** Entity'nin soft delete edilip edilmediğini kontrol eder.

**Parametre:** `entityType: string`, `entityId: string`

**Dönüş:** `Promise<SoftDeleteCheckResult>`

---

## 🛠️ Utility Fonksiyonları

### `diffChanges(oldData, newData, excludeFields?)`
**Açıklama:** İki obje arasındaki değişiklikleri `{ old, new }` formatında çıkarır.

**Örnek:**

```typescript
const changes = diffChanges(
  { name: 'Ali', age: 25 },
  { name: 'Ali', age: 26 }
);
// { age: { old: 25, new: 26 } }
```

### `maskSensitiveData(data, sensitiveFields?)`
**Açıklama:** Hassas verileri maskeler. İç içe objelerde de recursive çalışır.

**Örnek:**

```typescript
const masked = maskSensitiveData({ password: 'secret', name: 'Ali' });
// { password: '[REDACTED]', name: 'Ali' }
```

### `generateChangesSummary(changes, maxLength?)`
**Açıklama:** Değişikliklerin okunabilir özetini oluşturur.

**Örnek:**

```typescript
const summary = generateChangesSummary({ email: { old: 'a@a.com', new: 'b@b.com' } });
// 'email: "a@a.com" → "b@b.com"'
```

### `getClientIp(req)`
**Açıklama:** IP adresini alır. Proxy (X-Forwarded-For) ve Cloudflare destekli.

### `getUserAgent(req)`
**Açıklama:** Tarayıcı bilgisini alır.

### `generateAuditId()`
**Açıklama:** Benzersiz audit log ID'si üretir. Format: `audit_[16 hex karakter]`

---

## 📊 Test

```bash
pnpm test
```

| Metrik | Değer |
|---|---|
| Test Sayısı | 137 |
| Statement Coverage | %92.27 |
| Branch Coverage | %88.26 |
| Function Coverage | %91.04 |
| Line Coverage | %94.68 |
| Test Suite | 4/4 PASS |

---

## 🔒 Güvenlik

- ✅ Hassas veri maskeleme (password, creditCard, ssn, token, apiKey, privateKey)
- ✅ X-Forwarded-For + Cloudflare IP desteği
- ✅ Input validasyonu (tüm servislerde)
- ✅ AppError ile standart hata yönetimi
- ✅ Transaction desteği (GDPR + SoftDelete)
- ✅ Case-insensitive hassas alan tespiti

---

## 📄 Lisans

MIT