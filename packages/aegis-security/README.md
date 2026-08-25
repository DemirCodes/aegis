# 🔒 @aegis/security

**AEGIS Framework - Rate Limiting, JWT, Risk Scoring**

> Kim, ne kadar, ne riskle? Rate limiting, IP blacklist, JWT auth, risk skorlama.

**Bağımlılıklar:** `@aegis/core`, `@aegis/cache`, `@aegis/audit`

---

## 📦 Kurulum

```bash
pnpm add @aegis/security
```

---

## 🚀 Hızlı Başlangıç

```typescript
import {
  RateLimiterService,
  JWTService,
  RiskScoringService,
} from '@aegis/security';

const rateLimiter = new RateLimiterService();
const jwtService = new JWTService();
const riskScoring = new RiskScoringService();

// Rate limit kontrolü
const result = await rateLimiter.checkRateLimit('user:123', 100, 60000);

// Token üret
const token = await jwtService.generateToken({ sub: 'user-123', role: 'admin' });

// Risk skoru hesapla
const score = await riskScoring.calculateRiskScore('user-123', { ipAddress: '1.2.3.4' });
```

---

## 📌 Middleware

### `rateLimiterMiddleware(options?)`

**Açıklama:** IP/kullanıcı bazlı rate limit uygular.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `windowMs` | `number` | `60000` | Zaman penceresi (ms) |
| `maxRequests` | `number` | `100` | Max istek sayısı |
| `message` | `string` | - | Limit aşımı mesajı |

**Dönüş:** Express middleware

**Kullanım:**
```typescript
app.use(rateLimiterMiddleware({ windowMs: 60000, maxRequests: 100 }));
```

---

### `ipBlacklistMiddleware()`

**Açıklama:** Kara listedeki IP'leri engeller.

**Dönüş:** Express middleware

**Kullanım:**
```typescript
app.use(ipBlacklistMiddleware());
```

---

### `riskScoringMiddleware()`

**Açıklama:** Her isteğe risk skoru hesaplar.

**Dönüş:** Express middleware

**Kullanım:**
```typescript
app.use(riskScoringMiddleware());
```

---

### `corsMiddleware(options?)`

**Açıklama:** CORS header'larını ekler.

**Dönüş:** Express middleware

**Kullanım:**
```typescript
app.use(corsMiddleware({ origin: 'https://example.com' }));
```

---

## 📌 RateLimiterService

### `checkRateLimit(key, limit, window)`

**Açıklama:** İzin var mı kontrol eder. Redis/cache kullanır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `key` | `string` | Limit key (`user:123`, `ip:1.2.3.4`) |
| `limit` | `number` | Max istek sayısı |
| `window` | `number` | Zaman penceresi (ms) |

**Dönüş:** `Promise<RateLimitResult>`

**Kullandığı:** `cache.get()`, `cache.set()`

**Kullanım:**
```typescript
const result = await rateLimiter.checkRateLimit('user:123', 100, 60000);
// { allowed: true, remaining: 85, resetAt: '2024-01-15T10:31:00Z' }

if (!result.allowed) {
  return res.status(429).json({ retryAfter: result.resetAt });
}
```

---

### `getRateLimitStatus(key)`

**Açıklama:** Spesifik key'in durumunu getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `key` | `string` | Limit key |

**Dönüş:** `Promise<RateLimitStatus>`

**Kullanım:**
```typescript
const status = await rateLimiter.getRateLimitStatus('user:123');
// { requests: 15, limit: 100, resetAt: '...' }
```

---

### `resetRateLimit(key)`

**Açıklama:** Key'in limitini sıfırlar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `key` | `string` | Limit key |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await rateLimiter.resetRateLimit('user:123');
```

---

### `setGlobalLimit(limit, window)`

**Açıklama:** Global varsayılan limiti ayarlar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `limit` | `number` | Max istek sayısı |
| `window` | `number` | Zaman penceresi (ms) |

**Dönüş:** `void`

**Kullanım:**
```typescript
rateLimiter.setGlobalLimit(200, 60000); // 200 istek/dakika
```

---

### `getGlobalLimitStatus()`

**Açıklama:** Global limit durumunu getirir.

**Dönüş:** `RateLimitStatus`

**Kullanım:**
```typescript
const globalStatus = rateLimiter.getGlobalLimitStatus();
// { limit: 200, window: 60000 }
```

---

### `bulkCheckRateLimit(keys, limit, window)`

**Açıklama:** Birden fazla key'i toplu kontrol eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `keys` | `string[]` | Key listesi |
| `limit` | `number` | Max istek sayısı |
| `window` | `number` | Zaman penceresi (ms) |

**Dönüş:** `Promise<RateLimitResult[]>`

**Kullanım:**
```typescript
const results = await rateLimiter.bulkCheckRateLimit(['user:1', 'user:2'], 100, 60000);
```

---

## 📌 IPBlacklistService

### `addToBlacklist(ip, reason?, expiresAt?)`

**Açıklama:** IP'yi kara listeye ekler.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `ip` | `string` | IP adresi |
| `reason` | `string` | Neden |
| `expiresAt` | `Date` | Geçici süre (opsiyonel) |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await ipBlacklist.addToBlacklist('1.2.3.4', 'Spam saldırısı');
```

---

### `removeFromBlacklist(ip)`

**Açıklama:** IP'yi kara listeden çıkarır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `ip` | `string` | IP adresi |

**Dönüş:** `Promise<boolean>`

**Kullanım:**
```typescript
const removed = await ipBlacklist.removeFromBlacklist('1.2.3.4');
```

---

### `isBlacklisted(ip)`

**Açıklama:** IP kara listede mi?

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `ip` | `string` | IP adresi |

**Dönüş:** `Promise<boolean>`

**Kullanım:**
```typescript
const blocked = await ipBlacklist.isBlacklisted('1.2.3.4');
```

---

### `getBlacklist(options?)`

**Açıklama:** Kara listeyi getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `options.limit` | `number` | Max kayıt |
| `options.offset` | `number` | Atlama |

**Dönüş:** `Promise<IPBlacklistEntry[]>`

**Kullanım:**
```typescript
const list = await ipBlacklist.getBlacklist({ limit: 50 });
```

---

### `importBlacklist(ips)`

**Açıklama:** Birden fazla IP'yi toplu ekler.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `ips` | `string[]` | IP listesi |

**Dönüş:** `Promise<number>` - Eklenen sayısı

**Kullanım:**
```typescript
const count = await ipBlacklist.importBlacklist(['1.2.3.4', '5.6.7.8']);
```

---

### `exportBlacklist(format)`

**Açıklama:** Kara listeyi dışa aktarır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `format` | `'json' \| 'csv'` | Çıktı formatı |

**Dönüş:** `Promise<Buffer>`

**Kullandığı Core:** `core.exportData()`

**Kullanım:**
```typescript
const csv = await ipBlacklist.exportBlacklist('csv');
```

---

## 📌 JWTService

### `generateToken(payload, options?)`

**Açıklama:** Access token üretir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `payload` | `Record<string, any>` | Token payload |
| `options.expiresIn` | `string \| number` | Süre |
| `options.issuer` | `string` | İhraç eden |
| `options.audience` | `string` | Hedef |

**Dönüş:** `Promise<string>` - JWT token

**Kullanım:**
```typescript
const token = await jwtService.generateToken(
  { sub: 'user-123', role: 'admin' },
  { expiresIn: '1h' }
);
```

---

### `generateRefreshToken(userId, options?)`

**Açıklama:** Refresh token üretir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `userId` | `string` | Kullanıcı ID |
| `options` | `TokenOptions` | Süre vb. |

**Dönüş:** `Promise<string>`

**Kullanım:**
```typescript
const refreshToken = await jwtService.generateRefreshToken('user-123');
```

---

### `verifyToken(token)`

**Açıklama:** Token'ı doğrular.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `token` | `string` | JWT token |

**Dönüş:** `Promise<TokenPayload>`

**Kullanım:**
```typescript
const payload = await jwtService.verifyToken(token);
// { sub: 'user-123', role: 'admin', iat: 1234567890, exp: 1234571490 }
```

---

### `revokeToken(token)`

**Açıklama:** Token'ı iptal eder (blacklist'e ekler).

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `token` | `string` | JWT token |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await jwtService.revokeToken(token);
```

---

### `isTokenRevoked(token)`

**Açıklama:** Token iptal edilmiş mi?

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `token` | `string` | JWT token |

**Dönüş:** `Promise<boolean>`

**Kullanım:**
```typescript
const revoked = await jwtService.isTokenRevoked(token);
```

---

### `rotateRefreshToken(oldToken)`

**Açıklama:** Eski token'ı iptal edip yeni token çifti üretir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `oldToken` | `string` | Eski refresh token |

**Dönüş:** `Promise<string>` - Yeni refresh token

**Kullanım:**
```typescript
const newRefreshToken = await jwtService.rotateRefreshToken(oldRefreshToken);
```

---

### `getTokenMetadata(token)`

**Açıklama:** Token'ın süre/iptal bilgisini getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `token` | `string` | JWT token |

**Dönüş:** `Promise<TokenMetadata>`

**Kullanım:**
```typescript
const meta = await jwtService.getTokenMetadata(token);
// { issuedAt: Date, expiresAt: Date, isExpired: false, isRevoked: false }
```

---

## 📌 RiskScoringService

### `calculateRiskScore(userId, context)`

**Açıklama:** 0-100 arası risk skoru hesaplar. Yüksekse audit'e yazar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `userId` | `string` | Kullanıcı ID |
| `context.ipAddress` | `string` | IP |
| `context.userAgent` | `string` | Tarayıcı |
| `context.location` | `string` | Konum |

**Dönüş:** `Promise<number>` - 0-100

**Kullandığı:** `audit.createAuditLog('RISK_FLAG')` (yüksekse)

**Kullanım:**
```typescript
const score = await riskScoring.calculateRiskScore('user-123', {
  ipAddress: '1.2.3.4',
  userAgent: 'Mozilla/5.0...',
});
// 75 → high risk
```

---

### `flagSuspiciousActivity(userId, activity)`

**Açıklama:** Şüpheli aktiviteyi kaydeder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `userId` | `string` | Kullanıcı ID |
| `activity` | `SuspiciousActivity` | Aktivite detayı |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await riskScoring.flagSuspiciousActivity('user-123', {
  type: 'multiple_failed_logins',
  severity: 'high',
});
```

---

### `requireStepUpAuth(userId, reason)`

**Açıklama:** 2FA gerekiyor mu kontrol eder.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `userId` | `string` | Kullanıcı ID |
| `reason` | `string` | Neden |

**Dönüş:** `Promise<boolean>`

**Kullanım:**
```typescript
const needs2FA = await riskScoring.requireStepUpAuth('user-123', 'high_risk_score');
```

---

### `recordSuccessfulAuth(userId, context)`

**Açıklama:** Başarılı girişi kaydeder (risk skorunu düşürür).

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `userId` | `string` | Kullanıcı ID |
| `context.method` | `string` | `password`, `2fa`, `biometric` |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await riskScoring.recordSuccessfulAuth('user-123', { method: '2fa' });
```

---

### `recordFailedAuth(userId, context)`

**Açıklama:** Başarısız girişi kaydeder (risk skorunu artırır).

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `userId` | `string` | Kullanıcı ID |
| `context.reason` | `string` | `wrong_password`, `rate_limit` |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await riskScoring.recordFailedAuth('user-123', { reason: 'wrong_password' });
```

---

### `getRiskHistory(userId, limit?)`

**Açıklama:** Geçmiş risk olaylarını getirir.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `userId` | `string` | - | Kullanıcı ID |
| `limit` | `number` | `100` | Max kayıt |

**Dönüş:** `Promise<RiskEvent[]>`

**Kullanım:**
```typescript
const history = await riskScoring.getRiskHistory('user-123', 50);
```

---

## 🔗 Delegasyon Özeti

| Kullandığı | Fonksiyon | Amaç |
|-----------|-----------|------|
| `core` | `createLogger()` | Logging |
| `core` | `AppError` | Hata yönetimi |
| `core` | `exportData()` | Blacklist export |
| `cache` | `get()` / `set()` | Rate limit state |
| `audit` | `getClientIp()` | IP çıkarımı |
| `audit` | `getUserAgent()` | User-Agent çıkarımı |
| `audit` | `createAuditLog()` | Risk olayı loglama |

---

## 📄 Lisans

MIT