// ============================================
// @aegis/core - Error Types
// Hata yönetimi için yardımcı tip tanımları
// ============================================

import type { ErrorCode, ErrorSeverity } from '../constants/error-codes';

// --- STANDART HATA FORMATI ---

// Uygulama genelinde kullanılan normalize edilmiş hata yapısı
// (AppError sınıfının interface karşılığı - tip kontrolleri için)
export type AppErrorType = {
  code: ErrorCode;                    // Sistem hata kodu (ErrorCodes enum'ından)
  message: string;                    // Kullanıcı dostu hata mesajı
  statusCode: number;                 // HTTP durum kodu (400, 401, 403, 404, 500, vs.)
  severity: ErrorSeverity;            // Hata önem seviyesi (DEBUG, INFO, WARNING, ERROR, CRITICAL)
  details?: Record<string, any>;      // Teknik detaylar (validasyon hataları, stack trace)
  originalError?: Error;              // Wrap edilmiş orijinal hata (zincirleme için)
  isOperational: boolean;             // Operasyonel hata mı? (false = programlama hatası/bug)
  timestamp: string;                  // Hata oluşma zamanı (ISO 8601 formatında)
};

// --- HATA BAĞLAMI (CONTEXT) ---

// Hata yakalandığında eklenen bağlamsal bilgiler
// Logger ve audit sistemi tarafından kullanılır
export type ErrorContext = {
  userId?: string;                    // Hatayı tetikleyen kullanıcı ID'si
  requestId?: string;                 // HTTP istek ID'si (trace-id, correlation-id)
  operation?: string;                 // Hangi işlem sırasında oldu? (örn: "createOrder", "processPayment")
  metadata?: Record<string, any>;     // Esnek ek bağlamsal veri
  source?: string;                    // Hatanın kaynağı (örn: "PaymentService", "AuthMiddleware")
};

// --- LOGGER SEVİYELERİ ---

// Logger çıktı seviyeleri (Winston uyumlu)
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
// debug : Geliştirme detayları (sadece development ortamında)
// info  : Bilgilendirme (normal operasyon akışı)
// warn  : Uyarı (potansiyel sorun, ama işlem devam eder)
// error : Hata (işlem başarısız, müdahale gerekebilir)

// --- LOGGER KONFİGÜRASYONU ---

// Logger oluşturma opsiyonları
export type LoggerOptions = {
  level?: LogLevel;                   // Minimum log seviyesi (altındakiler ignore edilir)
  format?: 'json' | 'pretty';         // Log çıktı formatı (json: yapılandırılmış, pretty: okunaklı)
  service?: string;                   // Servis adı (mikroservis mimarilerinde kaynak belirtmek için)
  enableConsole?: boolean;            // Konsola yazdırma açık/kapalı
  enableFile?: boolean;               // Dosyaya yazma açık/kapalı
};

// --- RETRY (YENİDEN DENEME) ---

// Retry mekanizması için backoff stratejisi
export type BackoffOptions = {
  strategy: 'exponential' | 'fixed';  // exponential: 1s, 2s, 4s, 8s... | fixed: hep aynı süre
  delay?: number;                     // Başlangıç gecikmesi (ms, varsayılan: 1000)
  multiplier?: number;                // Exponential için çarpan (varsayılan: 2)
  maxDelay?: number;                  // Maksimum gecikme (ms, sınırsız büyümesin diye)
  maxRetries?: number;                // Maksimum deneme sayısı (varsayılan: 3)
};