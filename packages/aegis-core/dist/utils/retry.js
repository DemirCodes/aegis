"use strict";
// ============================================
// @aegis/core - Retry
// Başarısız işlemleri otomatik yeniden deneme mekanizması
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.retry = retry;
const common_helpers_1 = require("./common-helpers");
const logger_1 = require("./logger");
/**
 * Bir async fonksiyonu belirtilen stratejiyle tekrar dener
 *
 * Backoff stratejileri:
 * - exponential: 1s, 2s, 4s, 8s... (her denemede 2 kat artar)
 * - linear:      1s, 2s, 3s, 4s... (her denemede sabit miktar artar)
 * - fixed:       1s, 1s, 1s, 1s... (her denemede aynı süre)
 *
 * @param fn - Çalıştırılacak async fonksiyon
 * @param options - Retry konfigürasyonu
 * @returns Fonksiyonun başarılı sonucu
 * @throws Son denemede de başarısız olursa orijinal hatayı fırlatır
 *
 * @example
 * // Basit kullanım
 * const data = await retry(() => fetchData());
 *
 * @example
 * // Özelleştirilmiş
 * const data = await retry(() => fetchData(), {
 *   maxRetries: 5,
 *   delay: 2000,
 *   backoffStrategy: 'linear',
 *   onRetry: (attempt, error) => {
 *     console.warn(`Retry ${attempt}: ${error.message}`);
 *   },
 * });
 */
async function retry(fn, options) {
    const maxRetries = options?.maxRetries ?? 3;
    const baseDelay = options?.delay ?? 1000;
    const strategy = options?.backoffStrategy ?? 'exponential';
    const onRetry = options?.onRetry;
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Fonksiyonu çalıştır
            return await fn();
        }
        catch (error) {
            // Hatayı sakla (son denemede fırlatmak için)
            lastError = error instanceof Error ? error : new Error(String(error));
            // Son deneme ise hatayı fırlat
            if (attempt === maxRetries) {
                logger_1.logger.warn(`All ${maxRetries} retry attempts failed`, {
                    error: lastError.message,
                    strategy,
                });
                throw lastError;
            }
            // Bekleme süresini hesapla
            const waitTime = calculateDelay(strategy, baseDelay, attempt);
            // Retry callback'ini çağır (varsa)
            if (onRetry) {
                onRetry(attempt, lastError);
            }
            // Retry log'u
            logger_1.logger.warn(`Retry attempt ${attempt}/${maxRetries} after ${waitTime}ms`, {
                error: lastError.message,
                strategy,
                waitTime,
            });
            // Bekle ve tekrar dene
            await (0, common_helpers_1.delay)(waitTime);
        }
    }
    // Buraya asla ulaşılmaz (loop içinde throw var)
    // TypeScript memnuniyeti için:
    throw lastError;
}
/**
 * Backoff stratejisine göre bekleme süresini hesaplar
 *
 * @param strategy - Backoff stratejisi
 * @param baseDelay - Temel bekleme süresi (ms)
 * @param attempt - Mevcut deneme numarası (1-indexed)
 * @returns Hesaplanan bekleme süresi (ms)
 */
function calculateDelay(strategy, baseDelay, attempt) {
    switch (strategy) {
        case 'exponential':
            // 1.deneme: 1s, 2.deneme: 2s, 3.deneme: 4s, 4.deneme: 8s
            return baseDelay * Math.pow(2, attempt - 1);
        case 'linear':
            // 1.deneme: 1s, 2.deneme: 2s, 3.deneme: 3s
            return baseDelay * attempt;
        case 'fixed':
            // Tüm denemeler: 1s
            return baseDelay;
        default:
            return baseDelay;
    }
}
//# sourceMappingURL=retry.js.map