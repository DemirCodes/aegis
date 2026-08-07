// ============================================
// @aegis/core - App Error
// Framework'un temel hata sınıfı - tüm özel hatalar bundan türetilir
// ============================================

import { ErrorCode, ErrorSeverity, getHttpStatus, getSeverity, getCategory } from '../constants/error-codes';

// AppError constructor parametreleri için tip tanımı
export interface AppErrorOptions {
  code: ErrorCode;                              // Hata kodu (ErrorCodes enum'ından)
  message?: string;                             // İnsan tarafından okunabilir hata mesajı
  statusCode?: number;                          // HTTP durum kodu (belirtilmezse error-codes mapping'inden alınır)
  severity?: ErrorSeverity;                     // Hata önem seviyesi (audit log'lama kararı için)
  details?: Record<string, any>;                // Ek hata detayları (validation errors, stack trace vb.)
  originalError?: Error;                        // Orijinal hata (wrap edilmişse)
  isOperational?: boolean;                      // Operasyonel hata mı? (false = programlama hatası/bug)
}

export class AppError extends Error {
  // --- TEMEL ÖZELLİKLER ---
  public readonly code: ErrorCode;              // Makine tarafından okunabilir hata kodu
  public readonly statusCode: number;           // HTTP yanıt kodu
  public readonly severity: ErrorSeverity;      // Hata önem seviyesi (CRITICAL/ERROR/WARNING/INFO/DEBUG)
  public readonly details?: Record<string, any>; // Ek detaylar (esnek - her hata tipi kendi detayını ekleyebilir)
  public readonly originalError?: Error;        // Zincirlenmiş orijinal hata (debugging için)
  public readonly isOperational: boolean;       // true = beklenen hata, false = programlama hatası
  public readonly timestamp: string;            // Hatanın oluşma zamanı (ISO 8601)

  constructor(options: AppErrorOptions) {
    // Hata mesajını belirle (custom mesaj veya default)
    const message = options.message || options.code;
    super(message);
    
    // Hata sınıfı adını ayarla (instanceof kontrolleri için)
    this.name = 'AppError';
    
    // Zorunlu alanlar
    this.code = options.code;
    
    // HTTP status: belirtilmişse onu, yoksa error-codes mapping'inden al
    this.statusCode = options.statusCode || getHttpStatus(options.code);
    
    // Severity: belirtilmişse onu, yoksa error-codes mapping'inden al
    this.severity = options.severity || getSeverity(options.code);
    
    // Opsiyonel alanlar
    this.details = options.details;
    this.originalError = options.originalError;
    this.isOperational = options.isOperational ?? true; // Varsayılan: operasyonel hata
    this.timestamp = new Date().toISOString();
    
    // Stack trace'i yakala (bu constructor'ı atlayarak)
    Error.captureStackTrace(this, this.constructor);
  }

  // --- YARDIMCI METODLAR ---

  // Hatanın kritik olup olmadığını kontrol et (alert tetiklemek için)
  isCritical(): boolean {
    return this.severity === ErrorSeverity.CRITICAL;
  }

  // Hatanın tekrar denenebilir olup olmadığını kontrol et
  isRetryable(): boolean {
    const retryableCodes: ErrorCode[] = [
      'DB_CONNECTION_FAILED',
      'DB_CONNECTION_TIMEOUT',
      'DB_QUERY_TIMEOUT',
      'DB_DEADLOCK',
      'CACHE_CONNECTION_FAILED',
      'QUEUE_CONNECTION_FAILED',
      'NETWORK_CONNECTION_FAILED',
      'NETWORK_TIMEOUT',
      'EXTERNAL_API_TIMEOUT',
      'EXTERNAL_SERVICE_UNAVAILABLE',
      'EXTERNAL_CIRCUIT_BREAKER_OPEN',
    ];
    return retryableCodes.includes(this.code);
  }

  // Audit log'una yazılması gerekip gerekmediğini kontrol et
  shouldAudit(): boolean {
    return this.severity >= ErrorSeverity.ERROR; // ERROR ve CRITICAL seviyeler audit edilir
  }

  // Hatayı JSON formatına dönüştür (API yanıtları ve loglama için)
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      severity: this.severity,
      timestamp: this.timestamp,
      isOperational: this.isOperational,
      details: this.details,
      // Orijinal hatanın stack trace'ini sadece development'ta göster
      ...(process.env.NODE_ENV === 'development' && {
        stack: this.stack,
        originalError: this.originalError?.message,
      }),
    };
  }

  // --- STATIC FACTORY METODLAR (Hızlı hata oluşturma) ---

  // 500 - Beklenmeyen sunucu hatası
  static internal(message?: string, details?: Record<string, any>): AppError {
    return new AppError({
      code: 'INTERNAL_ERROR',
      message: message || 'Internal server error',
      details,
      isOperational: false, // Internal error'lar genelde programlama hatasıdır
    });
  }

  // 404 - Kaynak bulunamadı
  static notFound(resource?: string, details?: Record<string, any>): AppError {
    return new AppError({
      code: 'NOT_FOUND',
      message: resource ? `${resource} not found` : 'Resource not found',
      statusCode: 404,
      details,
    });
  }

  // 422 - Validasyon hatası
  static validation(message?: string, details?: Record<string, any>): AppError {
    return new AppError({
      code: 'VALIDATION_ERROR',
      message: message || 'Validation failed',
      statusCode: 422,
      details,
    });
  }

  // 401 - Kimlik doğrulama hatası
  static unauthorized(message?: string, details?: Record<string, any>): AppError {
    return new AppError({
      code: 'UNAUTHORIZED',
      message: message || 'Authentication required',
      statusCode: 401,
      details,
    });
  }

  // 403 - Yetki hatası
  static forbidden(message?: string, details?: Record<string, any>): AppError {
    return new AppError({
      code: 'FORBIDDEN',
      message: message || 'Access denied',
      statusCode: 403,
      details,
    });
  }

  // 409 - Çakışma hatası
  static conflict(message?: string, details?: Record<string, any>): AppError {
    return new AppError({
      code: 'CONFLICT',
      message: message || 'Resource already exists',
      statusCode: 409,
      details,
    });
  }

  // 429 - Rate limit aşıldı
  static tooManyRequests(message?: string, details?: Record<string, any>): AppError {
    return new AppError({
      code: 'TOO_MANY_REQUESTS',
      message: message || 'Too many requests',
      statusCode: 429,
      details,
    });
  }
}