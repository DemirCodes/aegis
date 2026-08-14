import type { ErrorContext, AppErrorType } from '../types/errors.types';
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
export declare function handleError(error: Error, context?: ErrorContext): AppErrorType;
//# sourceMappingURL=error-handler.d.ts.map