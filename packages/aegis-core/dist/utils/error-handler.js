"use strict";
// ============================================
// @aegis/core - Error Handler
// Hataları standardize eder, log'lar ve güvenli yanıt formatına dönüştürür
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = handleError;
const app_error_1 = require("../errors/app-error");
const error_codes_1 = require("../constants/error-codes");
const logger_1 = require("./logger");
/**
 * Yakalanan hatayı işler, log'lar ve güvenli bir şekilde dışa aktarır
 *
 * - AppError ise: Kod, mesaj ve detayları standardize eder
 * - Standart Error ise: INTERNAL_ERROR olarak işaretler
 * - Production'da: Internal detayları gizler (güvenlik)
 * - Development'da: Tüm detayları gösterir (debugging)
 *
 * @param error - Yakalanan hata (AppError veya standart Error)
 * @param context - Hata bağlamı (userId, requestId, operation vb.)
 * @returns Standardize edilmiş hata objesi (AppErrorType)
 *
 * @example
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const handled = handleError(error, {
 *     userId: 'user_123',
 *     operation: 'createOrder',
 *   });
 *   return res.status(handled.statusCode).json({ error: handled });
 * }
 */
function handleError(error, context) {
    // Ortam kontrolü (production'da internal detayları gizle)
    const isProduction = process.env.NODE_ENV === 'production';
    // --- APP ERROR (Bilinen hata) ---
    if (error instanceof app_error_1.AppError) {
        // Hatayı log'la (tüm detaylarıyla - production'da bile log'lanır)
        logger_1.logger.error(error.message, error, {
            ...context,
            errorCode: error.code,
            severity: error.severity,
            isOperational: error.isOperational,
        });
        // Dışa dönük mesajı ayarla
        return {
            code: error.code,
            message: isProduction && error.statusCode === 500
                ? 'Internal server error' // Production'da internal detayları gizle
                : error.message, // Development'da veya 4xx hatalarında gerçek mesajı göster
            statusCode: error.statusCode,
            severity: error.severity,
            timestamp: error.timestamp,
            details: isProduction
                ? undefined // Production'da teknik detayları gösterme
                : error.details, // Development'da tüm detayları göster
            isOperational: error.isOperational,
        };
    }
    // --- STANDART ERROR (Beklenmeyen hata) ---
    // Bilinmeyen hataları log'la
    logger_1.logger.error(error.message, error, {
        ...context,
        errorCode: error_codes_1.ErrorCodes.INTERNAL_ERROR,
    });
    // Güvenli yanıt formatına dönüştür
    return {
        code: error_codes_1.ErrorCodes.INTERNAL_ERROR,
        message: isProduction
            ? 'Internal server error' // Production'da genel mesaj
            : error.message, // Development'da orijinal mesaj
        statusCode: 500,
        severity: 3, // ERROR seviyesi
        timestamp: new Date().toISOString(),
        isOperational: false, // Beklenmeyen hata = programlama hatası
        details: isProduction
            ? undefined
            : { stack: error.stack }, // Development'da stack trace'i göster
    };
}
//# sourceMappingURL=error-handler.js.map