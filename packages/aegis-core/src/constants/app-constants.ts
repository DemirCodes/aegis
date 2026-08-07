// ============================================
// @aegis/core - Application Constants
// Framework genelinde kullanılan sabit değerler
// ============================================

// --- UYGULAMA METADATA ---
export const APP_NAME = 'AEGIS';              // Framework adı (log ve header'larda kullanılır)
export const APP_VERSION = '0.1.0';           // Semver uyumlu versiyon (breaking changes takibi için)

// --- AUDIT (DENETİM) AYARLARI ---
export const AUDIT_DEFAULT_RETENTION_DAYS = 90;      // Audit log'ların varsayılan saklanma süresi (gün)
export const AUDIT_MAX_BATCH_SIZE = 1000;             // Tek seferde yazılacak maksimum audit kaydı (performans optimizasyonu)
export const AUDIT_FLUSH_INTERVAL_MS = 5000;          // Buffer'daki audit log'ların diske yazılma sıklığı (ms)

// --- SAYFALAMA (PAGINATION) AYARLARI ---
export const DEFAULT_PAGE_SIZE = 20;          // Liste sorgularında varsayılan sayfa boyutu
export const MAX_PAGE_SIZE = 100;             // İzin verilen maksimum sayfa boyutu (kötüye kullanımı engeller)

// --- ÖNBELLEK (CACHE) AYARLARI ---
export const DEFAULT_CACHE_TTL = 3600;        // Cache'lenen verinin varsayılan yaşam süresi (saniye = 1 saat)

// --- RATE LIMIT (İSTEK SINIRLAMA) AYARLARI ---
export const DEFAULT_RATE_LIMIT_WINDOW = 60000;  // Rate limit sayacının sıfırlanma aralığı (ms = 1 dakika)
export const DEFAULT_RATE_LIMIT_MAX = 100;       // Pencere başına izin verilen maksimum istek sayısı

// --- HTTP STATUS KODLARI ---
// Standart HTTP yanıt kodları - magic number kullanımını engeller
export const HTTP_STATUS = {
  OK: 200,                          // İstek başarılı
  CREATED: 201,                     // Kaynak başarıyla oluşturuldu
  NO_CONTENT: 204,                  // Başarılı fakat dönüş gövdesi yok (silme işlemleri)
  BAD_REQUEST: 400,                 // Geçersiz/hatalı istek (validasyon hataları)
  UNAUTHORIZED: 401,                // Kimlik doğrulama gerekli (token yok/geçersiz)
  FORBIDDEN: 403,                   // Yetki yetersiz (kimlik doğrulandı ama izin yok)
  NOT_FOUND: 404,                   // İstenen kaynak bulunamadı
  CONFLICT: 409,                    // Kaynak çakışması (unique constraint vb.)
  TOO_MANY_REQUESTS: 429,           // Rate limit aşıldı
  INTERNAL_SERVER_ERROR: 500,       // Beklenmeyen sunucu hatası
  SERVICE_UNAVAILABLE: 503,         // Servis geçici olarak kullanım dışı
} as const;                         // Sabit değerler - değiştirilemez

// HTTP_STATUS değerlerinden türetilen tip (type-safe kullanım için)
export type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];
// Örnek: const status: HttpStatusCode = HTTP_STATUS.OK; ✅
// Örnek: const status: HttpStatusCode = 999; ❌ TypeScript hatası