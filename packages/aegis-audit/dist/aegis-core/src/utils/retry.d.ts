export type RetryOptions = {
    maxRetries?: number;
    delay?: number;
    backoffStrategy?: 'exponential' | 'linear' | 'fixed';
    onRetry?: (attempt: number, error: Error) => void;
};
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
export declare function retry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
//# sourceMappingURL=retry.d.ts.map