// ============================================
// @aegis/core - Validation Error
// Girdi doğrulama hataları için özelleştirilmiş hata sınıfı
// ============================================

import { AppError } from './app-error';

// Tekil validasyon hatası tipi
export interface ValidationErrorItem {
  path: string;       // Hatanın oluştuğu alan (örn: 'user.email', 'body.password')
  message: string;    // İnsan tarafından okunabilir hata mesajı
  code: string;       // Makine tarafından okunabilir hata kodu (örn: 'invalid_email', 'too_short')
}

export class ValidationError extends AppError {
  // Validasyon hatalarının listesi (birden fazla alan aynı anda hata verebilir)
  public readonly validationErrors: ValidationErrorItem[];

  constructor(
    message: string = 'Validation failed',
    validationErrors: ValidationErrorItem[] = [],
  ) {
    // AppError constructor'ını çağır (validasyon hataları details içinde)
    super({
      code: 'VALIDATION_ERROR',
      message,
      statusCode: 422, // Unprocessable Entity
      details: {
        validationErrors,                   // Hataları details'e göm
        errorCount: validationErrors.length, // Kaç alanın hatalı olduğu
      },
    });
    
    // Hata sınıfı adını özelleştir
    this.name = 'ValidationError';
    
    // Validasyon hatalarını doğrudan erişilebilir yap
    this.validationErrors = validationErrors;
  }

  // --- YARDIMCI METODLAR ---

  // Hatalı alanların isimlerini döndürür (loglama ve debug için)
  getErrorPaths(): string[] {
    return this.validationErrors.map(e => e.path);
  }

  // Belirli bir alanda hata var mı kontrol eder
  hasError(path: string): boolean {
    return this.validationErrors.some(e => e.path === path);
  }

  // Belirli bir alandaki ilk hatayı getirir
  getError(path: string): ValidationErrorItem | undefined {
    return this.validationErrors.find(e => e.path === path);
  }

  // Tüm hata mesajlarını string olarak birleştirir (kullanıcıya göstermek için)
  getSummary(): string {
    return this.validationErrors
      .map(e => `${e.path}: ${e.message}`)
      .join('; ');
  }

  // JSON formatına dönüştürür (API yanıtı için override)
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),                    // AppError'un JSON'unu al
      validationErrors: this.validationErrors, // Validasyon hatalarını ekle
    };
  }
}