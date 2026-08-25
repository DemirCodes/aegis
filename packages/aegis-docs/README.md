# 📚 @aegis/docs

**AEGIS Framework - Documentation Generator**

> Kendi kendini belgeleyen framework. Tüm Tier-1/2 paketlerinden otomatik dokümantasyon üretir.

**Bağımlılıklar:** Tüm Tier 1 & Tier 2 paketleri

---

## 📦 Kurulum

```bash
pnpm add @aegis/docs
```

---

## 🚀 Hızlı Başlangıç

```typescript
import {
  generateApiDocs,
  generateArchitectureDocs,
  generateADR,
} from '@aegis/docs';

// API dokümantasyonu üret
await generateApiDocs(['@aegis/audit', '@aegis/security'], './docs/api');

// Mimari doküman üret
await generateArchitectureDocs({ outputDir: './docs' });

// ADR oluştur
await generateADR([{
  title: 'Observability Strategy',
  context: 'Neden OpenTelemetry kullanıyoruz?',
  consequences: 'Tam izleme, düşük maliyet',
}]);
```

---

## 📌 Fonksiyonlar

### `generateApiDocs(packages, outputDir)`

**Açıklama:** OpenAPI/Swagger dokümantasyonu üretir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `packages` | `string[]` | Paket listesi (`['@aegis/audit', '@aegis/security']`) |
| `outputDir` | `string` | Çıktı dizini |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await generateApiDocs(
  ['@aegis/audit', '@aegis/security', '@aegis/queue'],
  './docs/api-reference'
);
// OpenAPI dokümanları oluşturuldu
```

---

### `generateArchitectureDocs(config)`

**Açıklama:** Mimari doküman üretir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `config.outputDir` | `string` | Çıktı dizini |
| `config.format` | `'md' \| 'html' \| 'pdf'` | Format |
| `config.includeDiagrams` | `boolean` | Diyagram dahil et |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await generateArchitectureDocs({
  outputDir: './docs/architecture',
  format: 'md',
  includeDiagrams: true,
});
```

---

### `generateCodeExamples(sourceDir, outputDir)`

**Açıklama:** Kod örnekleri üretir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `sourceDir` | `string` | Kaynak kod dizini |
| `outputDir` | `string` | Çıktı dizini |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await generateCodeExamples(
  './packages/aegis-audit/src',
  './docs/examples'
);
// Her fonksiyon için kullanım örneği üretildi
```

---

### `generateMigrationGuide(fromVersion, toVersion)`

**Açıklama:** Sürüm geçiş rehberi üretir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `fromVersion` | `string` | Eski sürüm (`1.0.0`) |
| `toVersion` | `string` | Yeni sürüm (`2.0.0`) |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await generateMigrationGuide('1.0.0', '2.0.0');
// Breaking changes + geçiş adımları dokümanı üretildi
```

---

### `generateADR(decisions)`

**Açıklama:** Architecture Decision Record oluşturur.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `decisions[].title` | `string` | Karar başlığı |
| `decisions[].context` | `string` | Bağlam/neden |
| `decisions[].consequences` | `string` | Sonuçlar |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await generateADR([
  {
    title: 'Cache Invalidation Strategy',
    context: 'Neden write-through yerine cache-aside?',
    consequences: 'Daha hızlı okuma, tutarlılık riski minimal',
  },
  {
    title: 'Observability Strategy',
    context: 'OpenTelemetry vs Datadog?',
    consequences: 'Vendor bağımsızlık, açık kaynak',
  },
]);
// ADR dokümanları oluşturuldu
```

---

## 🔗 Delegasyon Özeti

| Kullandığı | Amaç |
|-----------|------|
| `@aegis/core` | Logger, AppError |
| `@aegis/validation` | Zod şemalarından OpenAPI üretimi |
| `@aegis/audit` | Audit fonksiyon dokümantasyonu |
| `@aegis/observability` | Metrik dokümantasyonu |

---

## 📄 Lisans

MIT