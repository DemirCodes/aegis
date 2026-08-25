# ✅ @aegis/validation

**AEGIS Framework - Zod + gRPC Validation Bridge**

> Veri doğru mu? Zod tabanlı doğrulama + Zod'dan otomatik gRPC proto üretimi.

**Bağımlılıklar:** `@aegis/core` (ValidationError)

---

## 📦 Kurulum

```bash
pnpm add @aegis/validation
```

---

## 🚀 Hızlı Başlangıç

```typescript
import { ZodValidatorService, ProtoGeneratorService } from '@aegis/validation';
import { z } from 'zod';

const validator = new ZodValidatorService();
const protoGenerator = new ProtoGeneratorService();

// Schema tanımla
const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  age: z.number().int().min(18),
});

// Doğrula
const result = await validator.validate(data, userSchema);

// Proto üret
const proto = await protoGenerator.generateProtoFromZod(userSchema, 'User');
```

---

## 📌 Middleware

### `validationMiddleware(schema?)`

**Açıklama:** Express request'ini Zod schema'ya karşı doğrular.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `schema` | `ZodSchema` | Doğrulama şeması (opsiyonel) |

**Dönüş:** Express middleware

**Kullandığı Core:** `core.ValidationError`

**Kullanım:**
```typescript
import express from 'express';
import { validationMiddleware } from '@aegis/validation';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

app.post('/users', validationMiddleware(createUserSchema), (req, res) => {
  // req.body artık doğrulanmış ve tip güvenli
  const { email, password } = req.body;
});
```

---

## 📌 ZodValidatorService

### `validate(data, schema)`

**Açıklama:** Senkron doğrulama. Hata varsa `ValidationError` fırlatır.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `data` | `any` | Doğrulanacak veri |
| `schema` | `ZodSchema` | Şema |

**Dönüş:** `T` - Doğrulanmış ve tip güvenli veri

**Kullandığı Core:** `core.ValidationError`

**Kullanım:**
```typescript
const userSchema = z.object({
  email: z.string().email(),
  age: z.number().min(18),
});

const validData = validator.validate({ email: 'test@a.com', age: 25 }, userSchema);
// Tip güvenli: { email: string, age: number }

// Hata durumunda:
// throw new ValidationError('Geçersiz veri', [{ path: 'email', message: '...', code: '...' }])
```

---

### `validateAsync(data, schema)`

**Açıklama:** Asenkron doğrulama. Custom async rule'lar için.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `data` | `any` | Doğrulanacak veri |
| `schema` | `ZodSchema` | Şema (async refine destekli) |

**Dönüş:** `Promise<T>`

**Kullanım:**
```typescript
const userSchema = z.object({
  email: z.string().email().refine(
    async (email) => !(await db.user.findUnique({ where: { email } })),
    'Bu email zaten kayıtlı'
  ),
});

const validData = await validator.validateAsync(data, userSchema);
```

---

### `sanitize(data, schema)`

**Açıklama:** Veriyi temizler (trim, tip dönüşümü). Hata fırlatmaz.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `data` | `any` | Temizlenecek veri |
| `schema` | `ZodSchema` | Şema |

**Dönüş:** Temizlenmiş veri

**Kullanım:**
```typescript
const data = { name: '  Ali  ', age: '25' };
const clean = validator.sanitize(data, z.object({
  name: z.string().trim(),
  age: z.coerce.number(),
}));
// { name: 'Ali', age: 25 }
```

---

### `parseRequest(req, schema)`

**Açıklama:** Express request body'sini doğrular.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `req` | `Request` | Express request |
| `schema` | `ZodSchema` | Body şeması |

**Dönüş:** `Promise<any>` - Doğrulanmış body

**Kullanım:**
```typescript
const parsed = await validator.parseRequest(req, createUserSchema);
// req.body doğrulandı
```

---

### `parseResponse(data, schema)`

**Açıklama:** Response'u göndermeden önce doğrular.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `data` | `any` | Response verisi |
| `schema` | `ZodSchema` | Response şeması |

**Dönüş:** `Promise<any>` - Doğrulanmış response

**Kullanım:**
```typescript
const safeResponse = await validator.parseResponse(apiResponse, userResponseSchema);
// Response gönderilmeden önce doğrulandı
```

---

### `getSchemaErrors(data, schema)`

**Açıklama:** Doğrulama hatalarını detaylı getirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `data` | `any` | Veri |
| `schema` | `ZodSchema` | Şema |

**Dönüş:** `ValidationErrorDetail[]`

**Kullanım:**
```typescript
const errors = validator.getSchemaErrors(badData, userSchema);
// [{ path: 'email', message: 'Geçersiz email', code: 'INVALID_EMAIL' }]
```

---

### `formatErrors(errors)`

**Açıklama:** Zod hatalarını okunabilir formata çevirir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `errors` | `ValidationErrorDetail[]` | Hata listesi |

**Dönüş:** `Record<string, string | string[]>`

**Kullanım:**
```typescript
const formatted = validator.formatErrors(errors);
// { email: 'Geçersiz email formatı', age: ['18 yaşından küçük olamaz'] }
```

---

## 📌 ProtoGeneratorService

### `generateProtoFromZod(schema, messageName)`

**Açıklama:** Zod schema'dan gRPC `.proto` message üretir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `schema` | `ZodSchema` | Kaynak şema |
| `messageName` | `string` | Message adı (`User`, `Product`) |

**Dönüş:** `Promise<string>` - Proto syntax

**Kullanım:**
```typescript
const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().min(0),
});

const proto = await protoGenerator.generateProtoFromZod(userSchema, 'User');
// message User {
//   string id = 1;
//   string email = 2;
//   int32 age = 3;
// }
```

---

### `generateProtosFromSchemas(schemas)`

**Açıklama:** Birden fazla Zod schema'dan toplu proto üretir.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `schemas` | `Record<string, ZodSchema>` | İsim-şema çiftleri |

**Dönüş:** `Promise<Record<string, string>>` - Proto içerikleri

**Kullanım:**
```typescript
const protos = await protoGenerator.generateProtosFromSchemas({
  User: userSchema,
  Product: productSchema,
});
// { User: 'message User {...}', Product: 'message Product {...}' }
```

---

### `writeProtoFile(content, path)`

**Açıklama:** Proto içeriğini dosyaya yazar.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `content` | `string` | Proto içeriği |
| `path` | `string` | Dosya yolu (`./protos/user.proto`) |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await protoGenerator.writeProtoFile(proto, './protos/user.proto');
```

---

### `compileProtos(protoDir, outputDir)`

**Açıklama:** `.proto` dosyalarını TypeScript tip'lerine derler.

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `protoDir` | `string` | Proto dizini |
| `outputDir` | `string` | Çıktı dizini |

**Dönüş:** `Promise<void>`

**Kullanım:**
```typescript
await protoGenerator.compileProtos('./protos', './src/generated');
// .proto dosyaları TS tiplerine derlendi
```

---

## 🔗 Delegasyon Özeti

| Kullandığı | Fonksiyon | Amaç |
|-----------|-----------|------|
| `core` | `ValidationError` | Doğrulama hatası fırlatma |
| `core` | `createLogger()` | Logging |

---

## 📄 Lisans

MIT