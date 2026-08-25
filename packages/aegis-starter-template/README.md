# 🚀 @aegis/starter-template

**AEGIS Framework - Project Scaffold & Docker Setup**

> Sıfırdan projeye 1 komutla. Docker, CI/CD, env, tüm Tier-1/2 paketleri hazır.

**Bağımlılıklar:** Tüm Tier 1 & Tier 2 paketleri

---

## 📦 Kurulum

```bash
pnpm add @aegis/starter-template
```

---

## 🚀 Hızlı Başlangıç

```bash
npx create-aegis-app my-api --template microservice --database postgresql

cd my-api
docker-compose up -d
pnpm run dev
```

---

## 📌 Fonksiyonlar

### `createAegisApp(name, options?)`

**Açıklama:** Proje yapısını, Docker'ı, CI/CD'yi otomatik kurar.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `name` | `string` | - | Proje adı |
| `options.template` | `'basic' \| 'microservice' \| 'api'` | `'basic'` | Şablon tipi |
| `options.database` | `'postgresql' \| 'mysql'` | `'postgresql'` | Veritabanı |
| `options.messaging` | `'bullmq' \| 'kafka' \| 'rabbitmq'` | `'bullmq'` | Mesajlaşma |
| `options.auth` | `'jwt' \| 'oauth2' \| 'none'` | `'jwt'` | Auth yöntemi |
| `options.monitoring` | `boolean` | `true` | Prometheus + Grafana |

**Dönüş:** `Promise<AppGenerationResult>`

**Oluşturulanlar:**
- ✅ Proje klasör yapısı
- ✅ `docker-compose.yml` (DB + Redis + Mesajlaşma)
- ✅ `Dockerfile` (multi-stage)
- ✅ `.env.example`
- ✅ `.github/workflows/` (CI/CD)
- ✅ `package.json` (tüm AEGIS paketleri)
- ✅ `tsconfig.json`

**Kullanım:**
```bash
npx create-aegis-app my-payment-api \
  --template microservice \
  --database postgresql \
  --messaging kafka \
  --auth jwt \
  --monitoring true
```

---

### `setupDocker(projectDir, services?)`

**Açıklama:** `docker-compose.yml` üretir.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `projectDir` | `string` | - | Proje dizini |
| `services` | `string[]` | `['postgresql', 'redis']` | Servis listesi |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
import { setupDocker } from '@aegis/starter-template';

await setupDocker(process.cwd(), [
  'postgresql',
  'redis',
  'kafka',
  'grafana',
]);
// docker-compose.yml oluşturuldu
```

---

### `generateEnv(projectDir, template?)`

**Açıklama:** `.env` dosyası üretir.

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `projectDir` | `string` | - | Proje dizini |
| `template` | `'development' \| 'production'` | `'development'` | Env şablonu |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
import { generateEnv } from '@aegis/starter-template';

await generateEnv(process.cwd(), 'development');
// .env dosyası oluşturuldu
```

---

### `setupGithubActions(projectDir)`

**Açıklama:** Lint/test/build/deploy workflow'ları ekler.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `projectDir` | `string` | Proje dizini |

**Dönüş:** `Promise<void>`

**Oluşturulanlar:**
- ✅ `.github/workflows/lint.yml`
- ✅ `.github/workflows/test.yml`
- ✅ `.github/workflows/build.yml`
- ✅ `.github/workflows/deploy.yml`

**Kullanım:**
```typescript
import { setupGithubActions } from '@aegis/starter-template';

await setupGithubActions(process.cwd());
// CI/CD workflow'ları hazır
```

---

## 🔗 Delegasyon Özeti

| Kullandığı | Amaç |
|-----------|------|
| `@aegis/core` | Logger, AppError, ID üretimi |
| `@aegis/audit` | Audit altyapısı (otomatik dahil) |
| `@aegis/observability` | Monitoring (Prometheus + Grafana) |
| `@aegis/resilience` | Health check altyapısı |
| `@aegis/cache` | Redis bağlantısı |
| `@aegis/validation` | Request doğrulama |
| `@aegis/queue` | Job processing |
| `@aegis/security` | JWT + Rate limiting |

---

## 📄 Lisans

MIT