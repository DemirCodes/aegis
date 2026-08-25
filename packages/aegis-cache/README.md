# 🔐 @aegis/cache

**AEGIS Framework - Smart Caching & Invalidation**

> Redis'i akıllı kullan. Method-level caching, otomatik invalidation, üç farklı strateji.

**Bağımlılıklar:** `@aegis/core`, `@aegis/observability`

---

## 📦 Kurulum

```bash
pnpm add @aegis/cache
```

---

## 🚀 Hızlı Başlangıç

```typescript
import { CacheService, CacheInvalidationService } from '@aegis/cache';

const cacheService = new CacheService();
const invalidationService = new CacheInvalidationService();

// Temel kullanım
await cacheService.set('user:123', userData, 3600);
const user = await cacheService.get('user:123');

// Decorator ile otomatik cache
class UserService {
  @Cacheable({ ttl: 3600, key: (id) => `user:${id}` })
  async getUserById(id: string) {
    return db.user.findUnique({ where: { id } });
  }
}
```

---

## 📌 Decorators

### `@Cacheable(options)`

**Açıklama:** Metod sonucunu otomatik cache'ler.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `ttl` | `number` | `3600` | Cache süresi (**saniye**) |
| `key` | `string \| ((...args) => string)` | - | Cache key (metod adı) |
| `tags` | `string[]` | - | Tag listesi |
| `condition` | `(...args) => boolean` | - | Cache etme koşulu |

**Dönüş:** Decorator

**Kullanım:**
```typescript
@Cacheable({ ttl: 3600, key: (id) => `user:${id}`, tags: ['user'] })
async getUserById(id: string) {
  return db.user.findUnique({ where: { id } });
}
// İlk çağrı DB'den okur + cache'ler
// Sonraki çağrılar cache'ten döner (1 saat)
```

---

### `@CacheInvalidate(options)`

**Açıklama:** Metod çalışınca ilgili cache'i otomatik siler.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `key` | `string \| ((...args) => string)` | Invalidate edilecek key |
| `tags` | `string[]` | Invalidate edilecek tag'ler |
| `pattern` | `RegExp` | Regex pattern |

**Dönüş:** Decorator

**Kullanım:**
```typescript
@CacheInvalidate({ tags: ['user'] })
async updateUser(id: string, data: UpdateUserDto) {
  return db.user.update({ where: { id }, data });
}
// Metod çalışınca tüm 'user' tag'li cache'ler silinir
```

---

## 📌 CacheService

### `get(key)`

**Açıklama:** Cache'ten değer okur.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `key` | `string` | Cache key |

**Dönüş:** `Promise<T | null>` - Cache miss ise null

**Kullanım:**
```typescript
const user = await cacheService.get<User>('user:123');
if (!user) {
  // Cache'te yok, DB'den oku
}
```

---

### `set(key, value, ttl?)`

**Açıklama:** Cache'e değer yazar.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `key` | `string` | - | Cache key |
| `value` | `T` | - | Değer |
| `ttl` | `number` | `3600` | Süre (**saniye**) |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await cacheService.set('user:123', userData, 3600);
```

---

### `del(key)`

**Açıklama:** Cache key'ini siler.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `key` | `string` | Cache key |

**Dönüş:** `Promise<boolean>` - Silindi mi?

**Kullanım:**
```typescript
const deleted = await cacheService.del('user:123');
```

---

### `exists(key)`

**Açıklama:** Key cache'te var mı?

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `key` | `string` | Cache key |

**Dönüş:** `Promise<boolean>`

**Kullanım:**
```typescript
const hasKey = await cacheService.exists('user:123');
```

---

### `getMany(keys)`

**Açıklama:** Birden fazla key'i tek seferde okur.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `keys` | `string[]` | Key listesi |

**Dönüş:** `Promise<(T | null)[]>`

**Kullanım:**
```typescript
const users = await cacheService.getMany<User>(['user:1', 'user:2', 'user:3']);
// [{...}, null, {...}] - null = cache miss
```

---

### `setMany(entries, ttl?)`

**Açıklama:** Birden fazla key'i tek seferde yazar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `entries` | `[string, T][]` | Key-value çiftleri |
| `ttl` | `number` | Süre (saniye) |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await cacheService.setMany([
  ['user:1', user1],
  ['user:2', user2],
], 3600);
```

---

### `delMany(keys)`

**Açıklama:** Birden fazla key'i siler.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `keys` | `string[]` | Key listesi |

**Dönüş:** `Promise<number>` - Silinen key sayısı

**Kullanım:**
```typescript
const deletedCount = await cacheService.delMany(['user:1', 'user:2']);
```

---

### `delPattern(pattern)`

**Açıklama:** Wildcard pattern'e uyan tüm key'leri siler.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `pattern` | `string` | Pattern (`user:*`) |

**Dönüş:** `Promise<number>` - Silinen key sayısı

**Kullanım:**
```typescript
const deletedCount = await cacheService.delPattern('user:*');
// Tüm user cache'leri silindi
```

---

### `invalidateByTag(tag)`

**Açıklama:** Belirli tag'e sahip tüm cache'leri siler.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `tag` | `string` | Tag adı (`user`, `product`) |

**Dönüş:** `Promise<number>` - Silinen key sayısı

**Kullanım:**
```typescript
const deletedCount = await cacheService.invalidateByTag('product');
```

---

### `clear()`

**Açıklama:** Tüm cache'i temizler.

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await cacheService.clear();
// Tüm cache boşaltıldı
```

---

### `getStats()`

**Açıklama:** Cache istatistiklerini getirir.

**Dönüş:** `Promise<CacheStats>`

**Kullandığı:** `observability.recordGauge()` (istatistik yayını)

**Kullanım:**
```typescript
const stats = await cacheService.getStats();
// { hits: 5000, misses: 200, hitRate: 96.2, keyCount: 320 }
```

---

## 📌 CacheInvalidationService

### `onDataChange(entityType, entityId, action)`

**Açıklama:** Veri değişince ilgili cache'leri otomatik invalidate eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `entityType` | `string` | Entity tipi (`User`, `Product`) |
| `entityId` | `string` | Entity ID |
| `action` | `'CREATE' \| 'UPDATE' \| 'DELETE'` | İşlem tipi |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await invalidationService.onDataChange('User', 'user-123', 'UPDATE');
// user:123, user:list, user:* pattern'ler temizlenir
```

---

### `invalidateEntityCache(entityType, entityId?)`

**Açıklama:** Entity'nin tüm cache'ini siler.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `entityType` | `string` | Entity tipi |
| `entityId` | `string` | Entity ID (opsiyonel, boşsa tümü) |

**Dönüş:** `Promise<number>` - Silinen key sayısı

**Kullanım:**
```typescript
await invalidationService.invalidateEntityCache('Product');
// Tüm product cache'leri silindi
```

---

### `warmCache(keys, preloadFn)`

**Açıklama:** Cache'i önceden doldurur (warming).

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `keys` | `string[]` | Doldurulacak key'ler |
| `preloadFn` | `(key) => Promise<any>` | Veriyi getiren fonksiyon |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await invalidationService.warmCache(
  ['product:1', 'product:2', 'product:3'],
  async (key) => {
    const id = key.split(':')[1];
    return db.product.findUnique({ where: { id } });
  }
);
```

---

### `getInvalidationStrategy(entityType)`

**Açıklama:** Entity tipi için invalidation stratejisini getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `entityType` | `string` | Entity tipi |

**Dönüş:** `'write-through' | 'cache-aside' | 'write-behind'`

**Kullanım:**
```typescript
const strategy = invalidationService.getInvalidationStrategy('Order');
// 'write-through'
```

---

### `setInvalidationRule(entityType, rule)`

**Açıklama:** Entity tipi için cascade invalidation kuralı tanımlar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `entityType` | `string` | Entity tipi |
| `rule.trigger` | `'immediate' \| 'delayed'` | Tetikleme tipi |
| `rule.delay` | `number` | Gecikme (ms) |
| `rule.cascadeInvalidate` | `string[]` | Birlikte silinecekler |

**Dönüş:** `void`

**Kullanım:**
```typescript
invalidationService.setInvalidationRule('Order', {
  trigger: 'immediate',
  cascadeInvalidate: ['user-orders', 'order-stats']
});
// Order silinince user-orders ve order-stats de temizlenir
```

---

## 📌 Stratejiler

### `writeThrough(key, fn, ttl?)`

**Açıklama:** Cache + kaynağa aynı anda yazar (tutarlı ama yavaş).

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `key` | `string` | Cache key |
| `fn` | `() => Promise<T>` | Kaynak fonksiyon |
| `ttl` | `number` | Süre (saniye) |

**Dönüş:** `Promise<T>`

**Kullanım:**
```typescript
const data = await writeThrough('user:123', () => db.user.update(...));
// DB'ye yazar + cache'i günceller
```

---

### `cacheAside(key, fn, ttl?)`

**Açıklama:** Cache miss'te kaynaktan okur (en yaygın).

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `key` | `string` | Cache key |
| `fn` | `() => Promise<T>` | Kaynak fonksiyon |
| `ttl` | `number` | Süre (saniye) |

**Dönüş:** `Promise<T>`

**Kullanım:**
```typescript
const data = await cacheAside('user:123', () => db.user.findUnique(...));
// Cache'te varsa ordan, yoksa DB'den okur + cache'ler
```

---

### `writeBehind(key, fn, ttl?)`

**Açıklama:** Cache'e yazar, kaynağı asenkron günceller (hızlı ama riskli).

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `key` | `string` | Cache key |
| `fn` | `() => Promise<T>` | Kaynak fonksiyon |
| `ttl` | `number` | Süre (saniye) |

**Dönüş:** `Promise<T>`

**Kullanım:**
```typescript
const data = await writeBehind('user:123', () => db.user.update(...));
// Cache'e hemen yazar, DB'ye arka planda yazar
```

---

## 🔗 Delegasyon Özeti

| Kullandığı | Fonksiyon | Amaç |
|-----------|-----------|------|
| `core` | `createLogger()` | Logging |
| `core` | `AppError` | Hata yönetimi |
| `core` | `DEFAULT_CACHE_TTL` | Varsayılan TTL |
| `observability` | `recordGauge()` | Cache istatistikleri |

---

## 📄 Lisans

MIT