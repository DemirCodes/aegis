# 🧪 @aegis/testing

**AEGIS Framework - Test Utilities**

> Güvenle test yaz. İzole test DB/Redis, mock'lar, fixture'lar, entity fabrikaları.

**Bağımlılıklar:** `@aegis/core`, tüm diğer paketler (mocklama için)

---

## 📦 Kurulum

```bash
pnpm add -D @aegis/testing
```

---

## 🚀 Hızlı Başlangıç

```typescript
import {
  createTestDatabase,
  createTestRedis,
  seedDatabase,
  cleanupDatabase,
} from '@aegis/testing';

// Test DB oluştur
const db = await createTestDatabase();

// Test Redis oluştur
const redis = await createTestRedis();

// Seed data yükle
await seedDatabase(db, [
  { table: 'User', data: [{ email: 'test@a.com', name: 'Test' }] },
]);

// Test bitti - temizle
await cleanupDatabase(db);
```

---

## 📌 Fonksiyonlar

### `createTestDatabase(config?)`

**Açıklama:** İzole test veritabanı açar.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `config.template` | `'postgresql' \| 'mysql'` | `'postgresql'` | DB tipi |
| `config.isolate` | `boolean` | `true` | Her test için temiz DB |

**Dönüş:** `Promise<PrismaClient>` - Test DB client

**Kullanım:**
```typescript
const db = await createTestDatabase({ isolate: true });
// Her test suite için bağımsız DB
```

---

### `createTestRedis(config?)`

**Açıklama:** Test Redis instance'ı açar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `config.port` | `number` | Port (varsayılan farklı) |
| `config.inMemory` | `boolean` | Memory-only (Redis mock) |

**Dönüş:** `Promise<Redis>` - Test Redis client

**Kullanım:**
```typescript
const redis = await createTestRedis({ inMemory: true });
// Docker gerektirmeyen hızlı Redis
```

---

### `seedDatabase(db, fixtures)`

**Açıklama:** Test veritabanına veri yükler.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `db` | `PrismaClient` | Test DB client |
| `fixtures[].table` | `string` | Tablo adı |
| `fixtures[].data` | `Record<string, any>[]` | Kayıt listesi |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await seedDatabase(db, [
  { table: 'User', data: [{ email: 'test@a.com' }, { email: 'test@b.com' }] },
  { table: 'Product', data: [{ sku: 'P1', price: 100 }] },
]);
```

---

### `cleanupDatabase(db)`

**Açıklama:** Test sonrası veritabanını temizler.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `db` | `PrismaClient` | Test DB client |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
afterAll(async () => {
  await cleanupDatabase(db);
});
```

---

### `mockGrpcCall(service, method, response)`

**Açıklama:** gRPC çağrısını mock'lar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `service` | `string` | Servis adı (`PaymentService`) |
| `method` | `string` | Metod adı (`processPayment`) |
| `response` | `any` | Mock dönüş değeri |

**Dönüş:** `void`

**Kullanım:**
```typescript
mockGrpcCall('PaymentService', 'processPayment', {
  success: true,
  transactionId: 'txn-123',
});
// Artık bu çağrı gerçekten gitmez, mock döner
```

---

### `createMockRequest(overrides?)`

**Açıklama:** Sahte Express Request oluşturur.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `overrides.method` | `string` | HTTP metodu |
| `overrides.path` | `string` | URL yolu |
| `overrides.body` | `any` | Body |
| `overrides.headers` | `Record<string, string>` | Header'lar |
| `overrides.user` | `any` | Kullanıcı bilgisi |

**Dönüş:** `Request`

**Kullanım:**
```typescript
const req = createMockRequest({
  method: 'POST',
  path: '/api/users',
  body: { email: 'test@a.com' },
  headers: { 'x-correlation-id': 'trace-123' },
  user: { id: 'user-123' },
});
```

---

### `createMockResponse()`

**Açıklama:** Sahte Express Response oluşturur.

**Dönüş:** `Response`

**Kullanım:**
```typescript
const res = createMockResponse();
// res.json(), res.status(), res.send() hazır mock
```

---

### `createRequestContext(overrides?)`

**Açıklama:** Sahte request context oluşturur.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `overrides.userId` | `string` | Kullanıcı ID |
| `overrides.correlationId` | `string` | Trace ID |
| `overrides.role` | `string` | Rol |

**Dönüş:** `RequestContext`

**Kullanım:**
```typescript
const context = createRequestContext({
  userId: 'user-123',
  correlationId: 'trace-abc',
  role: 'admin',
});
```

---

## 📌 TestFactory

**Açıklama:** Entity fabrikaları. Tekrarlayan test verisi oluşturmayı kolaylaştırır.

**Kullanım:**
```typescript
import { TestFactory } from '@aegis/testing';

const factory = new TestFactory();

// Kullanıcı oluştur
const user = factory.createUser({ email: 'test@a.com' });
const admin = factory.createUser({ role: 'admin' });

// Audit log oluştur
const auditLog = factory.createAuditLog({ action: 'UPDATE' });

// Product oluştur
const product = factory.createProduct({ sku: 'PROD-001' });

// Order oluştur
const order = factory.createOrder({ userId: user.id });

// Toplu üretim
const users = factory.createMany('User', 10, { isActive: true });
```

**Mevcut Fabrikalar:**
- `createUser(overrides?)`
- `createAuditLog(overrides?)`
- `createProduct(overrides?)`
- `createOrder(overrides?)`
- `createPayment(overrides?)`
- `createRole(overrides?)`
- `createSession(overrides?)`
- `createMany(entity, count, overrides?)`

---

## 🔗 Delegasyon Özeti

| Kullandığı | Amaç |
|-----------|------|
| `@aegis/core` | Logger, ID üretimi |
| `@aegis/audit` | Audit fixture'ları |
| `@aegis/security` | Auth fixture'ları |
| `@aegis/queue` | Queue mock'ları |

---

## 📄 Lisans

MIT