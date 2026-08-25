# 🔄 @aegis/migration

**AEGIS Framework - Database Migrations**

> Şema ve veri güvenle değişsin. Migration çalıştırma, rollback, veri dönüştürme.

**Bağımlılıklar:** `@aegis/core`, `@aegis/queue`

---

## 📦 Kurulum

```bash
pnpm add @aegis/migration
```

---

## 🚀 Hızlı Başlangıç

```typescript
import {
  MigrationService,
  MigrationRunner,
  RollbackRunner,
} from '@aegis/migration';

const migrationService = new MigrationService();

// Yeni migration oluştur
const migration = await migrationService.createMigration('add_email_to_users', '1.0.1');

// Migration çalıştır
const result = await migrationService.runMigration(migration.name, 'up');

// Rollback
await migrationService.rollbackMigration(migration.name);
```

---

## 📌 Fonksiyonlar

### `createMigration(name, version)`

**Açıklama:** Yeni migration dosyası oluşturur.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `name` | `string` | Migration adı (`add_email_to_users`) |
| `version` | `string` | Sürüm (`1.0.1`) |

**Dönüş:** `Promise<Migration>`

**Kullanım:**
```typescript
const migration = await migrationService.createMigration('add_email_to_users', '1.0.1');
// { id: 'mig-1', name: 'add_email_to_users', version: '1.0.1', status: 'pending' }
```

---

### `runMigration(name, direction)`

**Açıklama:** Migration'ı çalıştırır (up/down).

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `name` | `string` | Migration adı |
| `direction` | `'up' \| 'down'` | Yön |

**Dönüş:** `Promise<MigrationResult>`

**Kullandığı:** `queue.addJob()` (uzun migration'lar için async)

**Kullanım:**
```typescript
const result = await migrationService.runMigration('add_email_to_users', 'up');
// { status: 'completed', duration: 250, appliedAt: Date }
```

---

### `rollbackMigration(name)`

**Açıklama:** Migration'ı geri alır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `name` | `string` | Migration adı |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await migrationService.rollbackMigration('add_email_to_users');
// Değişiklikler geri alındı
```

---

### `getMigrationStatus()`

**Açıklama:** Uygulanan/bekleyen migration'ları listeler.

**Dönüş:** `Promise<MigrationStatus[]>`

**Kullanım:**
```typescript
const status = await migrationService.getMigrationStatus();
// [{ name: 'add_email', status: 'executed' }, { name: 'add_phone', status: 'pending' }]
```

---

### `validateMigration(name)`

**Açıklama:** Syntax/bağımlılık kontrolü yapar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `name` | `string` | Migration adı |

**Dönüş:** `Promise<ValidationResult>`

**Kullanım:**
```typescript
const validation = await migrationService.validateMigration('add_email_to_users');
// { valid: true, errors: [] }
```

---

### `getMigrationHistory(limit?)`

**Açıklama:** Migration geçmişini getirir.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `limit` | `number` | `50` | Max kayıt |

**Dönüş:** `Promise<MigrationHistory[]>`

**Kullanım:**
```typescript
const history = await migrationService.getMigrationHistory(20);
// [{ name: 'add_email', appliedAt: Date, duration: 250, direction: 'up' }]
```

---

### `transformData(migration, transformer)`

**Açıklama:** Şema değişince veriyi dönüştürür.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `migration` | `Migration` | Migration bilgisi |
| `transformer` | `DataTransformer` | Dönüşüm fonksiyonu |

**Dönüş:** `Promise<TransformationResult>`

**Kullanım:**
```typescript
const result = await migrationService.transformData(migration, async (data) => {
  // Eski formattan yeni formata dönüştür
  return data.map(row => ({
    ...row,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
  }));
});
// { transformed: 1250, failed: 0 }
```

---

## 🔗 Delegasyon Özeti

| Kullandığı | Amaç |
|-----------|------|
| `@aegis/core` | Logger, AppError |
| `@aegis/queue` | Uzun migration'ları async çalıştırma |

---

## 📄 Lisans

MIT