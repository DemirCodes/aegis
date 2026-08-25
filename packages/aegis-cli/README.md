# 🖥️ @aegis/cli

**AEGIS Framework - Command Line Tools**

> Terminalden yönet. Diğer tüm paketlerin fonksiyonlarını komut satırına taşır. Kendi iş mantığı YOK - sadece delegasyon.

**Bağımlılıklar:** Tüm Tier 1-4 paketleri

---

## 📦 Kurulum

```bash
pnpm add @aegis/cli
# veya global
pnpm add -g @aegis/cli
```

---

## 🚀 Hızlı Başlangıç

```bash
# Yeni proje oluştur
aegis scaffold --name my-api --template microservice

# Sağlık kontrolü
aegis health-check

# Audit raporu dışa aktar
aegis audit-export --user user-123 --format pdf
```

---

## 📌 Komutlar

### `aegis scaffold`

**Açıklama:** Yeni AEGIS projesi oluşturur.

**Delege Ettiği:** `starter-template.createAegisApp()`

| Flag | Açıklama |
|------|----------|
| `--name <string>` | Proje adı |
| `--template <string>` | Şablon: `basic`, `microservice`, `api` |
| `--database <string>` | Veritabanı: `postgresql`, `mysql` |
| `--messaging <string>` | Mesajlaşma: `bullmq`, `kafka`, `rabbitmq` |

**Kullanım:**
```bash
aegis scaffold --name my-payment-api --template microservice
# Proje yapısı + Docker + CI/CD otomatik oluşturulur
```

---

### `aegis migrate up/down`

**Açıklama:** Veritabanı migration'larını çalıştırır.

**Delege Ettiği:** `migration.runMigration()`

| Argüman | Açıklama |
|---------|----------|
| `up [count]` | İleri migration (opsiyonel adet) |
| `down [count]` | Geri migration (opsiyonel adet) |

**Kullanım:**
```bash
aegis migrate up 2     # Son 2 migration'ı çalıştır
aegis migrate down 1   # Son 1 migration'ı geri al
```

---

### `aegis audit-export`

**Açıklama:** Audit raporunu dışa aktarır.

**Delege Ettiği:** `audit.exportAuditTrail()`

| Flag | Açıklama |
|------|----------|
| `--user <string>` | Kullanıcı filtresi |
| `--start <date>` | Başlangıç tarihi |
| `--end <date>` | Bitiş tarihi |
| `--format <string>` | `json`, `csv`, `pdf` |
| `--output <path>` | Çıktı dosya yolu |

**Kullanım:**
```bash
aegis audit-export --user user-123 --format pdf --output audit.pdf
```

---

### `aegis health-check`

**Açıklama:** Sistem sağlığını kontrol eder.

**Delege Ettiği:** `resilience.getAllHealthStatus()` + `observability.getServiceHealthStatus()`

| Flag | Açıklama |
|------|----------|
| `--service <string>` | Spesifik servis (opsiyonel) |

**Kullanım:**
```bash
aegis health-check                  # Tüm servisleri kontrol et
aegis health-check --service database  # Sadece database'i kontrol et
```

---

### `aegis benchmark`

**Açıklama:** API endpoint'ine yük testi çalıştırır.

**Delege Ettiği:** `performance.loadTest()`

| Flag | Açıklama |
|------|----------|
| `--endpoint <url>` | Test edilecek endpoint |
| `--concurrency <number>` | Eşzamanlı istek (default: 100) |
| `--duration <number>` | Süre/saniye (default: 60) |

**Kullanım:**
```bash
aegis benchmark http://localhost:3000/api/users --concurrency 500 --duration 120
```

---

### `aegis config get/set/list`

**Açıklama:** Ayar yönetimi. (Kendi basit state yönetimi - başka pakete delege ETMEZ)

| Argüman | Açıklama |
|---------|----------|
| `get <key>` | Değeri oku |
| `set <key> <value>` | Değer yaz |
| `list` | Tüm ayarları listele |

**Kullanım:**
```bash
aegis config set DATABASE_URL postgresql://localhost/mydb
aegis config get DATABASE_URL
aegis config list
```

---

### `aegis db-seed`

**Açıklama:** Veritabanına seed data yükler.

**Delege Ettiği:** `testing.seedDatabase()`

| Flag | Açıklama |
|------|----------|
| `--environment <string>` | `development`, `test` |

**Kullanım:**
```bash
aegis db-seed                    # Development seed
aegis db-seed --environment test # Test seed
```

---

### `aegis generate-docs`

**Açıklama:** Dokümantasyon üretir.

**Delege Ettiği:** `docs.generateApiDocs()`

| Flag | Açıklama |
|------|----------|
| `--output <path>` | Çıktı dizini |

**Kullanım:**
```bash
aegis generate-docs --output ./docs
# OpenAPI dokümantasyonu üretildi
```

---

## 🔗 Delegasyon Özeti

| Komut | Delege Ettiği Paket |
|-------|---------------------|
| `scaffold` | `starter-template.createAegisApp()` |
| `migrate` | `migration.runMigration()` |
| `audit-export` | `audit.exportAuditTrail()` |
| `health-check` | `resilience.getAllHealthStatus()` + `observability.getServiceHealthStatus()` |
| `benchmark` | `performance.loadTest()` |
| `config` | — (kendi yönetimi) |
| `db-seed` | `testing.seedDatabase()` |
| `generate-docs` | `docs.generateApiDocs()` |

---

## 📄 Lisans

MIT