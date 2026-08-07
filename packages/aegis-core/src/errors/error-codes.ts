// ============================================
// @aegis/core - Error Codes
// Framework genelinde kullanılan hata kodu sistemi
// ============================================

/**
 * SİSTEMSEL HATA KODLARI
 * 
 * Format: KATEGORI_ALTKATEGORI (string tabanlı, okunabilir)
 * 
 * Kategori Yapısı:
 * - SECURITY    : Kimlik doğrulama, yetkilendirme, şifreleme hataları
 * - PERFORMANCE : Zaman aşımı, kaynak tükenmesi, aşırı yüklenme
 * - QUEUE       : Mesaj kuyruğu bağlantı, publish/consume, DLQ hataları
 * - DATABASE    : Veritabanı bağlantı, sorgu, deadlock, replikasyon hataları
 * - CACHE       : Önbellek bağlantı, okuma/yazma, bellek hataları
 * - EXTERNAL    : Dış API, webhook, email, ödeme servisi hataları
 * - STORAGE     : Dosya sistemi, disk, yedekleme hataları
 * - NETWORK     : DNS, proxy, firewall, bant genişliği hataları
 * - CRITICAL    : Sistem çöküşü, bellek yetersizliği, veri bozulması
 * - AUDIT       : Denetim loglama ve GDPR hataları
 * - RESILIENCE  : Circuit breaker, retry mekanizması hataları
 */

export const ErrorCodes = {
  // --- GENEL HATALAR ---
  INTERNAL_ERROR: 'INTERNAL_ERROR',                   // Beklenmeyen sistem hatası (catch-all)
  NOT_FOUND: 'NOT_FOUND',                             // İstenen kaynak/veri bulunamadı
  VALIDATION_ERROR: 'VALIDATION_ERROR',               // Girdi doğrulama hatası
  UNAUTHORIZED: 'UNAUTHORIZED',                       // Kimlik doğrulama başarısız (401)
  FORBIDDEN: 'FORBIDDEN',                             // Yetki yetersiz (403)
  CONFLICT: 'CONFLICT',                               // Veri çakışması (409)
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',             // Rate limit aşıldı (429)

  // --- GÜVENLİK HATALARI (Security) ---
  SECURITY_TOKEN_EXPIRED: 'SECURITY_TOKEN_EXPIRED',           // JWT/Token süresi doldu
  SECURITY_TOKEN_INVALID: 'SECURITY_TOKEN_INVALID',           // Token imzası geçersiz
  SECURITY_TOKEN_MISSING: 'SECURITY_TOKEN_MISSING',           // Authorization header'ı eksik
  SECURITY_CSRF_INVALID: 'SECURITY_CSRF_INVALID',             // CSRF token doğrulaması başarısız
  SECURITY_BRUTE_FORCE: 'SECURITY_BRUTE_FORCE',               // Art arda başarısız giriş
  SECURITY_IP_BLOCKED: 'SECURITY_IP_BLOCKED',                 // IP kara listede
  SECURITY_ENCRYPTION_FAILED: 'SECURITY_ENCRYPTION_FAILED',   // Şifreleme/çözme başarısız
  SECURITY_HASH_FAILED: 'SECURITY_HASH_FAILED',               // Hash işlemi başarısız
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',                             // Token süresi doldu (alias)
  TOKEN_REVOKED: 'TOKEN_REVOKED',                             // Token iptal edildi
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',                 // Rate limit aşıldı (alias)
  IP_BLACKLISTED: 'IP_BLACKLISTED',                           // IP kara listede (alias)
  RISK_SCORE_HIGH: 'RISK_SCORE_HIGH',                         // Risk skoru yüksek (fraud tespiti)

  // --- PERFORMANS HATALARI ---
  PERFORMANCE_TIMEOUT: 'PERFORMANCE_TIMEOUT',                         // İşlem zaman aşımı
  PERFORMANCE_CPU_OVERLOAD: 'PERFORMANCE_CPU_OVERLOAD',               // CPU kritik seviyede
  PERFORMANCE_MEMORY_OVERLOAD: 'PERFORMANCE_MEMORY_OVERLOAD',         // Bellek kritik seviyede
  PERFORMANCE_CONNECTION_POOL_EXHAUSTED: 'PERFORMANCE_CONNECTION_POOL_EXHAUSTED', // Bağlantı havuzu tükendi
  PERFORMANCE_THREAD_POOL_EXHAUSTED: 'PERFORMANCE_THREAD_POOL_EXHAUSTED',         // Thread havuzu tükendi
  PERFORMANCE_RESOURCE_LEAK: 'PERFORMANCE_RESOURCE_LEAK',             // Kaynak sızıntısı

  // --- KUYRUK (QUEUE) HATALARI ---
  QUEUE_CONNECTION_FAILED: 'QUEUE_CONNECTION_FAILED',     // Message broker bağlantısı başarısız
  QUEUE_PUBLISH_FAILED: 'QUEUE_PUBLISH_FAILED',           // Mesaj gönderilemedi
  QUEUE_CONSUME_FAILED: 'QUEUE_CONSUME_FAILED',           // Mesaj işlenemedi
  QUEUE_DLQ_FULL: 'QUEUE_DLQ_FULL',                       // Dead Letter Queue dolu
  QUEUE_RETRY_EXHAUSTED: 'QUEUE_RETRY_EXHAUSTED',         // Yeniden deneme limiti doldu
  QUEUE_BACKPRESSURE: 'QUEUE_BACKPRESSURE',               // Geri basınç
  QUEUE_JOB_FAILED: 'QUEUE_JOB_FAILED',                   // Kuyruk işi başarısız
  DLQ_PROCESSING_FAILED: 'DLQ_PROCESSING_FAILED',         // DLQ işleme başarısız

  // --- VERİTABANI (DATABASE) HATALARI ---
  DB_CONNECTION_FAILED: 'DB_CONNECTION_FAILED',           // Veritabanına bağlanılamadı
  DB_CONNECTION_TIMEOUT: 'DB_CONNECTION_TIMEOUT',         // Bağlantı zaman aşımı
  DB_QUERY_FAILED: 'DB_QUERY_FAILED',                     // Sorgu çalıştırılamadı
  DB_QUERY_TIMEOUT: 'DB_QUERY_TIMEOUT',                   // Sorgu zaman aşımı
  DB_DEADLOCK: 'DB_DEADLOCK',                             // Deadlock tespiti
  DB_MIGRATION_FAILED: 'DB_MIGRATION_FAILED',             // Migrasyon başarısız
  DB_REPLICATION_LAG: 'DB_REPLICATION_LAG',               // Replikasyon gecikmesi
  DB_POOL_EXHAUSTED: 'DB_POOL_EXHAUSTED',                 // Bağlantı havuzu tükendi
  DB_CORRUPTED_DATA: 'DB_CORRUPTED_DATA',                 // Bozuk veri tespiti

  // --- ÖNBELLEK (CACHE) HATALARI ---
  CACHE_CONNECTION_FAILED: 'CACHE_CONNECTION_FAILED',     // Redis/Memcached bağlantısı başarısız
  CACHE_READ_FAILED: 'CACHE_READ_FAILED',                 // Cache okuma başarısız
  CACHE_WRITE_FAILED: 'CACHE_WRITE_FAILED',               // Cache yazma başarısız
  CACHE_INVALIDATION_FAILED: 'CACHE_INVALIDATION_FAILED', // Cache temizleme başarısız
  CACHE_MEMORY_FULL: 'CACHE_MEMORY_FULL',                 // Cache bellek limiti doldu
  CACHE_MISS: 'CACHE_MISS',                               // Cache'te anahtar bulunamadı
  CACHE_ERROR: 'CACHE_ERROR',                             // Genel cache hatası

  // --- DIŞ SERVİS (EXTERNAL) HATALARI ---
  EXTERNAL_API_TIMEOUT: 'EXTERNAL_API_TIMEOUT',                   // 3.parti API zaman aşımı
  EXTERNAL_API_FAILED: 'EXTERNAL_API_FAILED',                     // 3.parti API hatası
  EXTERNAL_SERVICE_UNAVAILABLE: 'EXTERNAL_SERVICE_UNAVAILABLE',   // Dış servis kullanılamıyor
  EXTERNAL_CIRCUIT_BREAKER_OPEN: 'EXTERNAL_CIRCUIT_BREAKER_OPEN', // Circuit breaker açık
  EXTERNAL_DNS_RESOLUTION_FAILED: 'EXTERNAL_DNS_RESOLUTION_FAILED', // DNS çözümleme başarısız

  // --- DEPOLAMA (STORAGE) HATALARI ---
  STORAGE_DISK_FULL: 'STORAGE_DISK_FULL',                 // Disk dolu
  STORAGE_READ_FAILED: 'STORAGE_READ_FAILED',             // Dosya okuma başarısız
  STORAGE_WRITE_FAILED: 'STORAGE_WRITE_FAILED',           // Dosya yazma başarısız
  STORAGE_FILE_NOT_FOUND: 'STORAGE_FILE_NOT_FOUND',       // Dosya bulunamadı
  STORAGE_FILE_TOO_LARGE: 'STORAGE_FILE_TOO_LARGE',       // Dosya boyutu aşıldı
  STORAGE_BACKUP_FAILED: 'STORAGE_BACKUP_FAILED',         // Yedekleme başarısız

  // --- AĞ (NETWORK) HATALARI ---
  NETWORK_CONNECTION_FAILED: 'NETWORK_CONNECTION_FAILED',     // Ağ bağlantısı başarısız
  NETWORK_DNS_FAILED: 'NETWORK_DNS_FAILED',                   // DNS çözümleme başarısız
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',                         // Ağ zaman aşımı
  NETWORK_BANDWIDTH_EXCEEDED: 'NETWORK_BANDWIDTH_EXCEEDED',   // Bant genişliği aşıldı

  // --- KRİTİK SİSTEM HATALARI ---
  CRITICAL_SYSTEM_PANIC: 'CRITICAL_SYSTEM_PANIC',                     // Sistem paniği
  CRITICAL_OUT_OF_MEMORY: 'CRITICAL_OUT_OF_MEMORY',                   // Bellek tükendi
  CRITICAL_SERVICE_HEALTH_FAILED: 'CRITICAL_SERVICE_HEALTH_FAILED',   // Sağlık kontrolü başarısız
  CRITICAL_STARTUP_FAILED: 'CRITICAL_STARTUP_FAILED',                 // Başlatma başarısız
  CRITICAL_DATA_CORRUPTION: 'CRITICAL_DATA_CORRUPTION',               // Veri bozulması
  CRITICAL_DEADLOCK: 'CRITICAL_DEADLOCK',                             // Sistem kilitlenmesi

  // --- AUDIT (DENETİM) HATALARI ---
  AUDIT_LOG_FAILED: 'AUDIT_LOG_FAILED',                     // Audit log'u yazılamadı
  GDPR_DELETION_FAILED: 'GDPR_DELETION_FAILED',             // GDPR silme işlemi başarısız

  // --- RESILIENCE (DAYANIKLILIK) HATALARI ---
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',                             // Circuit breaker açık (isteğe bağlı)
  RETRY_EXHAUSTED: 'RETRY_EXHAUSTED',                       // Tüm retry denemeleri tükendi
} as const;

// ErrorCodes değerlerinden türetilen tip
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];