# 🗂️ @aegis/audit

**AEGIS Framework - Audit Trail & GDPR Compliance**

> Her veri değişikliğini otomatik kaydeder, GDPR uyumluluğu sağlar, soft-delete yönetir.

**Bağımlılıklar:** `@aegis/core`, `@aegis/resilience`, `@aegis/queue`

---

## 📦 Kurulum

```bash
pnpm add @aegis/audit
```

---

## 🚀 Hızlı Başlangıç

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

---

## 📌 Decorators

### `@Audited(options?)`

**Açıklama:** Metod çağrısını otomatik audit'e yazar.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `include` | `string[]` | - | Whitelist - sadece bu alanlar loglanır |
| `exclude` | `string[]` | - | Blacklist - bu alanlar loglanmaz |
| `trackDeletes` | `boolean` | `true` | DELETE işlemlerini kaydet |
| `sensitive` | `boolean` | `false` | Hassas veri modu |
| `customFields` | `Record<string, any>` | - | Ekstra metadata |

**Kullandığı Core Fonksiyonları:** `core.diffChanges()`, `core.maskSensitiveData()`

**Kullanım:**
```typescript
import { Audited } from '@aegis/audit';

class UserService {
  @Audited({ exclude: ['password'] })
  async updateUser(id: string, data: UpdateUserDto) {
    // password loglanmaz, diğer her şey otomatik audit'e yazılır
  }

  @Audited({ trackDeletes: false })
  async softDeleteUser(id: string) {
    // DELETE işlemi loglanmaz
  }
}
```

### `@SoftDelete()`

**Açıklama:** Kalıcı silme yerine `deletedAt` işaretler.

**Kullandığı:** `SoftDeleteService.softDelete()`

**Kullanım:**
```typescript
import { SoftDelete } from '@aegis/audit';

class UserService {
  @SoftDelete()
  async deleteUser(id: string, context?: { userId?: string; reason?: string }) {
    // Kalıcı silmez, deletedAt set eder + audit log yazar
  }
}
```

---

## 📌 Middleware

### `auditMiddleware`

**Açıklama:** Tüm HTTP isteklerini otomatik loglar. GET isteklerini sadece hata durumunda loglar.

**Kullanım:**
```typescript
import express from 'express';
import { auditMiddleware } from '@aegis/audit';

const app = express();
app.use(auditMiddleware);
```

### `excludeFromAudit(paths)`

**Açıklama:** Belirli endpoint'leri audit'ten hariç tutar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `paths` | `string[]` | Hariç tutulacak endpoint'ler |

**Kullanım:**
```typescript
app.use(excludeFromAudit(['/health', '/metrics', '/auth/login']));
```

### `softDeleteFilter`

**Açıklama:** Silinmiş kayıtları response'tan gizler.

**Kullanım:**
```typescript
app.use(softDeleteFilter);
// Kullanıcılar silinmiş kayıtları GÖREMEZ
```

### `onlyDeletedFilter`

**Açıklama:** Sadece silinmiş kayıtları gösterir (admin paneli).

**Kullanım:**
```typescript
app.use('/admin', onlyDeletedFilter);
// Admin sadece silinmiş kayıtları görür
```

### `gdprErasureHandler`

**Açıklama:** GDPR silme isteğini işleyen route handler.

**Kullanım:**
```typescript
app.delete('/api/gdpr/:userId', gdprErasureHandler);
```

### `gdprExportHandler`

**Açıklama:** GDPR veri dışa aktarma handler'ı.

**Kullanım:**
```typescript
app.get('/api/gdpr/:userId/export', gdprExportHandler);
```

---

## 📌 AuditTrailService

**Açıklama:** Audit log CRUD işlemleri.

**Constructor:**
```typescript
new AuditTrailService(prisma: PrismaClient, sensitiveFields?: string[])
```

---

### `createAuditLog(userId, entityType, action, changes, metadata?)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `userId` | `string` | İşlemi yapan kullanıcı |
| `entityType` | `string` | Entity tipi (User, Product, Order) |
| `action` | `'CREATE' \| 'UPDATE' \| 'DELETE'` | İşlem tipi |
| `changes` | `Record<string, any>` | Değişiklikler |
| `metadata.ipAddress` | `string` | IP adresi |
| `metadata.userAgent` | `string` | Tarayıcı bilgisi |
| `metadata.correlationId` | `string` | Trace ID |
| `metadata.customFields` | `Record<string, any>` | Ek metadata |

**Dönüş:** `Promise<AuditLog>`

**Kullandığı Core:** `core.generateAuditId()`, `core.maskSensitiveData()`, `core.diffChanges()`

**Kullanım:**
```typescript
await auditService.createAuditLog(
  'user-123',
  'User',
  'UPDATE',
  { email: { old: 'a@a.com', new: 'b@b.com' } },
  { ipAddress: '192.168.1.1', correlationId: 'trace-abc' }
);
```

---

### `getAuditLogs(filters?, pagination?)`

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `filters.userId` | `string` | - | Kullanıcı filtresi |
| `filters.entityType` | `string` | - | Entity filtresi |
| `filters.action` | `string` | - | Aksiyon filtresi |
| `filters.startDate` | `Date` | - | Başlangıç tarihi |
| `filters.endDate` | `Date` | - | Bitiş tarihi |
| `filters.entityId` | `string` | - | Entity ID filtresi |
| `pagination.page` | `number` | `1` | Sayfa |
| `pagination.pageSize` | `number` | `20` | Sayfa başına kayıt |

**Dönüş:** `Promise<PaginatedAuditLogs>`

**Kullandığı Core:** `core.normalizePagination()`

**Kullanım:**
```typescript
const logs = await auditService.getAuditLogs(
  { userId: 'user-123', startDate: new Date('2024-01-01') },
  { page: 1, pageSize: 50 }
);
```

---

### `getAuditLogById(auditLogId)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `auditLogId` | `string` | Log ID |

**Dönüş:** `Promise<AuditLog | null>`

**Kullanım:**
```typescript
const log = await auditService.getAuditLogById('audit_9f3a2b1c4d5e6f7a');
```

---

### `searchAuditLogs(query, filters?)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `query` | `string` | Arama terimi |
| `filters` | `AuditFilters` | Ek filtreler |

**Dönüş:** `Promise<AuditLog[]>`

**Kullanım:**
```typescript
const results = await auditService.searchAuditLogs('user@email.com');
```

---

### `getUserActivityHistory(userId, options?)`

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `userId` | `string` | - | Kullanıcı ID |
| `options.limit` | `number` | `100` | Max kayıt |
| `options.includeFailures` | `boolean` | `true` | Başarısızları dahil et |
| `options.entityFilters` | `string[]` | - | Entity filtresi |

**Dönüş:** `Promise<UserActivityLog[]>`

**Kullanım:**
```typescript
const history = await auditService.getUserActivityHistory('user-123', { limit: 10 });
```

---

### `getEntityHistory(entityType, entityId)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `entityType` | `string` | Entity tipi |
| `entityId` | `string` | Entity ID |

**Dönüş:** `Promise<AuditLog[]>`

**Kullanım:**
```typescript
const productHistory = await auditService.getEntityHistory('Product', 'prod-123');
```

---

### `getAuditLogByCorrelationId(correlationId)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `correlationId` | `string` | Trace ID |

**Dönüş:** `Promise<AuditLog[]>`

**Kullanım:**
```typescript
const relatedLogs = await auditService.getAuditLogByCorrelationId('trace-abc');
```

---

### `bulkCreateAuditLogs(logs)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `logs` | `BulkCreateAuditLogInput[]` | Toplu loglar (max: 1000) |

**Dönüş:** `Promise<number>` - Yazılan kayıt sayısı

**Kullanım:**
```typescript
const count = await auditService.bulkCreateAuditLogs([
  { userId: 'u1', entityType: 'User', action: 'CREATE', changes: {...} },
  { userId: 'u2', entityType: 'Order', action: 'UPDATE', changes: {...} },
]);
```

---

### `retryFailedAuditLog(auditLogId)`

**Açıklama:** Başarısız log yazımını tekrar dener.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `auditLogId` | `string` | Log ID |

**Dönüş:** `Promise<boolean>`

**Kullandığı:** `resilience.executeWithRetry()`

**Kullanım:**
```typescript
const success = await auditService.retryFailedAuditLog('audit_9f3a...');
```

---

### `purgeOldAuditLogs(olderThan)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `olderThan` | `Date` | Bu tarihten eski loglar silinir |

**Dönüş:** `Promise<number>` - Silinen kayıt sayısı

**Kullanım:**
```typescript
const deleted = await auditService.purgeOldAuditLogs(new Date('2023-01-01'));
```

---

### `exportAuditTrail(filters, format)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `filters` | `AuditFilters` | Filtreler |
| `format` | `'json' \| 'csv' \| 'pdf'` | Çıktı formatı |

**Dönüş:** `Promise<Buffer>`

**Kullandığı Core:** `core.exportData()`

**Kullanım:**
```typescript
const pdf = await auditService.exportAuditTrail(
  { userId: 'user-123' },
  'pdf'
);
```

---

## 📌 GDPRDeletionService

**Açıklama:** GDPR uyumluluğu için veri silme/anonimleştirme/export.

**Constructor:**
```typescript
new GDPRDeletionService(prisma: PrismaClient, auditService: AuditTrailService)
```

---

### `eraseUserData(userId, reason)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `userId` | `string` | Silinecek kullanıcı |
| `reason` | `string` | Silme nedeni |

**Dönüş:** `Promise<GDPRErasureResult>`

**Özellik:** Transaction destekli (ya hep ya hiç)

**Kullanım:**
```typescript
const result = await gdprService.eraseUserData('user-123', 'user_requested');
// { status: 'completed', tablesAffected: ['User', 'UserSession', ...], recordsDeleted: 1250 }
```

---

### `exportUserData(userId, format?)`

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `userId` | `string` | - | Kullanıcı ID |
| `format` | `'json' \| 'csv'` | `'json'` | Çıktı formatı |

**Dönüş:** `Promise<UserDataExport>`

**Kullanım:**
```typescript
const data = await gdprService.exportUserData('user-123', 'json');
```

---

### `anonymizeUserData(userId, fields)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `userId` | `string` | Kullanıcı ID |
| `fields` | `string[]` | Anonimleştirilecek alanlar |

**Dönüş:** `Promise<AnonymizationResult>`

**Kullandığı Core:** `core.maskSensitiveData()`

**Kullanım:**
```typescript
const result = await gdprService.anonymizeUserData('user-123', ['email', 'phone', 'firstName']);
```

---

### `getCascadeDeletePlan(userId)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `userId` | `string` | Kullanıcı ID |

**Dönüş:** `Promise<CascadeDeletePlan>` - Silme öncesi etki analizi

**Kullanım:**
```typescript
const plan = await gdprService.getCascadeDeletePlan('user-123');
// { totalRecordsToDelete: 2500, tables: [...] }
```

---

### `verifyErasureCompletion(userId)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `userId` | `string` | Kullanıcı ID |

**Dönüş:** `Promise<ErasureVerification>`

**Kullanım:**
```typescript
const verify = await gdprService.verifyErasureCompletion('user-123');
// { isComplete: true, status: 'clean' }
```

---

### `scheduleDataErasure(userId, scheduledAt, reason)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `userId` | `string` | Kullanıcı ID |
| `scheduledAt` | `Date` | Ne zaman silinecek |
| `reason` | `string` | Silme nedeni |

**Dönüş:** `Promise<ScheduledErasure>`

**Kullandığı:** `queue.addJob()` (async)

**Kullanım:**
```typescript
const scheduled = await gdprService.scheduleDataErasure(
  'user-123',
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 gün sonra
  'user_requested_with_30day_delay'
);
```

---

### `cancelScheduledErasure(userId)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `userId` | `string` | Kullanıcı ID |

**Dönüş:** `boolean` - İptal edildi mi?

**Kullanım:**
```typescript
const cancelled = await gdprService.cancelScheduledErasure('user-123');
```

---

## 📌 SoftDeleteService

**Açıklama:** Soft delete yönetimi.

---

### `softDelete(entityType, entityId, deletedBy?, reason?)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `entityType` | `string` | Entity tipi |
| `entityId` | `string` | Entity ID |
| `deletedBy` | `string` | Silen kullanıcı |
| `reason` | `string` | Silme nedeni |

**Dönüş:** `Promise<SoftDeleteResult>`

**Kullanım:**
```typescript
await softDeleteService.softDelete('User', 'user-123', 'admin', 'inactive_account');
```

---

### `restore(entityType, entityId)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `entityType` | `string` | Entity tipi |
| `entityId` | `string` | Entity ID |

**Dönüş:** `Promise<RestoreResult>`

**Kullanım:**
```typescript
await softDeleteService.restore('User', 'user-123');
```

---

### `hardDelete(entityType, entityId)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `entityType` | `string` | Entity tipi |
| `entityId` | `string` | Entity ID |

**Dönüş:** `Promise<HardDeleteResult>`

**Kullanım:**
```typescript
await softDeleteService.hardDelete('User', 'user-123');
```

---

### `getSoftDeletedRecords(options?)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `options.entityType` | `string` | Entity filtresi |
| `options.limit` | `number` | Max kayıt |

**Dönüş:** `Promise<SoftDeletedRecord[]>`

**Kullanım:**
```typescript
const deleted = await softDeleteService.getSoftDeletedRecords({ entityType: 'User' });
```

---

### `isSoftDeleted(entityType, entityId)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `entityType` | `string` | Entity tipi |
| `entityId` | `string` | Entity ID |

**Dönüş:** `Promise<boolean>`

**Kullanım:**
```typescript
const isDeleted = await softDeleteService.isSoftDeleted('User', 'user-123');
```

---

## 📌 AuditReportService

**Açıklama:** Audit analitik ve raporlama.

---

### `generateSummaryReport(startDate, endDate)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `startDate` | `Date` | Başlangıç |
| `endDate` | `Date` | Bitiş |

**Dönüş:** `Promise<SummaryReport>`

**Kullanım:**
```typescript
const report = await auditReportService.generateSummaryReport(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
```

---

### `getMostActiveUsers(limit?)`

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `limit` | `number` | `10` | Max kayıt |

**Dönüş:** `Promise<ActiveUser[]>`

**Kullanım:**
```typescript
const topUsers = await auditReportService.getMostActiveUsers(5);
// [{ userId: 'user-1', totalActions: 152 }, ...]
```

---

### `getMostChangedEntities(limit?)`

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `limit` | `number` | `10` | Max kayıt |

**Dönüş:** `Promise<ChangedEntity[]>`

**Kullanım:**

```typescript
const topEntities = await auditReportService.getMostChangedEntities(5);
// [{ entityType: 'Product', totalChanges: 450 }, { entityType: 'Order', totalChanges: 320 }]
```

---

### `getHourlyActivity(date?)`

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `date` | `Date` | Bugün | Analiz edilecek gün |

**Dönüş:** `Promise<HourlyActivity>`
**Kullanım:**

```typescript
const hourly = await auditReportService.getHourlyActivity();
// { date: '2024-01-15', hourlyActivity: { 0: 5, 1: 2, 9: 45, 14: 120, 23: 3 } }
```
---

### `getDailyActivity(startDate, endDate)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `startDate` | `Date` | Başlangıç |
| `endDate` | `Date` | Bitiş |

**Dönüş:** `Promise<DailyActivity[]>`
**Kullanım:**

```typescript
const daily = await auditReportService.getDailyActivity(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
// [{ date: '2024-01-01', CREATE: 10, UPDATE: 25, DELETE: 3 }, ...]
```
---

### `getUserActivityTimeline(userId, period)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `userId` | `string` | Kullanıcı ID |
| `period` | `'day' \| 'week' \| 'month'` | Zaman aralığı |

**Dönüş:** `Promise<ActivityTimeline>`
**Kullanım:**

```typescript
const timeline = await auditReportService.getUserActivityTimeline('user-123', 'week');
// { userId: 'user-123', period: 'week', dataPoints: [{ date: '2024-01-01', count: 15 }, ...] }
```
---

### `getEntityChangeTrend(entityType, entityId)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `entityType` | `string` | Entity tipi |
| `entityId` | `string` | Entity ID |

**Dönüş:** `Promise<ChangeTrend>`
**Kullanım:**

```typescript
const trend = await auditReportService.getEntityChangeTrend('Product', 'prod-123');
// { entityType: 'Product', entityId: 'prod-123', changesPerDay: [3, 5, 2, 8] }
```
---

### `exportReport(startDate, endDate)`

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `startDate` | `Date` | Başlangıç |
| `endDate` | `Date` | Bitiş |

**Dönüş:** `Promise<string>` - JSON string
**Kullanım:**

```typescript
const jsonReport = await auditReportService.exportReport(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
// '{"totalActions":1520,"actionBreakdown":{"CREATE":300,"UPDATE":900,"DELETE":320}}'
```
---

## 📌 Utility Fonksiyonları

### `maskAuditSensitiveData(data)`

**Açıklama:** `core.maskSensitiveData()`'yı audit'e özel alan listesiyle çağırır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `data` | `any` | Maskelenecek veri |

**Dönüş:** Maskelenmiş veri

**Kullanım:**

```typescript
const masked = maskAuditSensitiveData({ password: 'x', creditCard: '1234', name: 'Ali' });
// { password: '[REDACTED]', creditCard: '[REDACTED]', name: 'Ali' }
```

**Kullandığı Core:** `core.maskSensitiveData()`

---

### `getClientIp(req)`

**Açıklama:** İstemci IP'sini çıkarır. X-Forwarded-For + Cloudflare destekli.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `req` | `Request` | Express request |

**Dönüş:** `string`
**Kullanım:**

```typescript
const ip = getClientIp(req);
// '192.168.1.1' veya Cloudflare: '203.0.113.5'
```
---

### `getUserAgent(req)`

**Açıklama:** Tarayıcı bilgisini çıkarır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `req` | `Request` | Express request |

**Dönüş:** `string`
**Kullanım:**

```typescript
const ua = getUserAgent(req);
// 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
```
---

## 🔗 Delegasyon Özeti

| Kullandığı | Fonksiyon | Amaç |
|-----------|-----------|------|
| `core` | `generateAuditId()` | ID üretimi |
| `core` | `maskSensitiveData()` | Hassas veri gizleme |
| `core` | `diffChanges()` | Değişiklik tespiti |
| `core` | `formatChangesSummary()` | Özet formatlama |
| `core` | `exportData()` | PDF/CSV/JSON export |
| `core` | `normalizePagination()` | Sayfalama |
| `core` | `AppError` | Hata yönetimi |
| `resilience` | `executeWithRetry()` | Retry (başarısız log tekrarı) |
| `queue` | `addJob()` | Async GDPR silme |

---

## 📄 Lisans

MIT