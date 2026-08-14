"use strict";
// ============================================
// @aegis/core - Validation Error
// Girdi doğrulama hataları için özelleştirilmiş hata sınıfı
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = void 0;
const app_error_1 = require("./app-error");
class ValidationError extends app_error_1.AppError {
    // Validasyon hatalarının listesi (birden fazla alan aynı anda hata verebilir)
    validationErrors;
    constructor(message = 'Validation failed', validationErrors = []) {
        // AppError constructor'ını çağır (validasyon hataları details içinde)
        super({
            code: 'VALIDATION_ERROR',
            message,
            statusCode: 422, // Unprocessable Entity
            details: {
                validationErrors, // Hataları details'e göm
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
    getErrorPaths() {
        return this.validationErrors.map(e => e.path);
    }
    // Belirli bir alanda hata var mı kontrol eder
    hasError(path) {
        return this.validationErrors.some(e => e.path === path);
    }
    // Belirli bir alandaki ilk hatayı getirir
    getError(path) {
        return this.validationErrors.find(e => e.path === path);
    }
    // Tüm hata mesajlarını string olarak birleştirir (kullanıcıya göstermek için)
    getSummary() {
        return this.validationErrors
            .map(e => `${e.path}: ${e.message}`)
            .join('; ');
    }
    // JSON formatına dönüştürür (API yanıtı için override)
    toJSON() {
        return {
            ...super.toJSON(), // AppError'un JSON'unu al
            validationErrors: this.validationErrors, // Validasyon hatalarını ekle
        };
    }
}
exports.ValidationError = ValidationError;
//# sourceMappingURL=validation-error.js.map