# Logger Kullanım Kılavuzu

## Temel Kullanım

```typescript
import { createLogger } from '@aegis/core';

const log = createLogger('user-service');

log.debug('Debug mesajı');
log.info('Kullanıcı oluşturuldu');
log.warn('Rate limit aşılmak üzere');
log.error('Veritabanı hatası', new Error('Connection refused'));
```

## Metadata ile

```typescript
log.info('Ödeme alındı', { userId: '123', amount: 250, currency: 'TRY' });
```

## Child Logger (Request Takibi)

```typescript
const childLog = log.child({ requestId: 'req-456', userId: '123' });
childLog.info('Request başladı');
// Tüm log'lara otomatik olarak requestId ve userId eklenir
```

## Konfigürasyon

```typescript
const log = createLogger('my-app', {
  level: 'debug',         // debug | info | warn | error
  format: 'pretty',       // pretty | json
  logDir: './logs',       // Dosya yolu
  enableConsole: true,    // Konsola yaz
  enableFile: false,      // Dosyaya yaz
  maxSize: '10mb',        // Max dosya boyutu
  maxFiles: 5,            // Max yedek dosya
});
```

## Seviyeler

| Seviye | Açıklama | Ne Zaman Kullanılır |
|--------|----------|---------------------|
| `debug` | Detaylı debug | Geliştirme sırasında |
| `info` | Genel bilgi | Normal işlemler |
| `warn` | Uyarı | Sorun olabilir ama kritik değil |
| `error` | Hata | Hemen müdahale gerektirir |

## Environment Variables

```bash
LOG_LEVEL=debug    # Log seviyesi
LOG_FORMAT=json    # Çıktı formatı
```