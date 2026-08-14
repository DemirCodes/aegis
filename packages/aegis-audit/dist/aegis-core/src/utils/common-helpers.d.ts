/**
 * Belirtilen süre kadar asenkron bekler (sleep)
 * @param ms - Beklenecek süre (milisaniye)
 * @returns Promise<void>
 *
 * @example
 * await delay(5000); // 5 saniye bekle
 */
export declare function delay(ms: number): Promise<void>;
/**
 * Nesneyi güvenli bir şekilde JSON string'e dönüştürür
 * - Döngüsel referansları (circular) handle eder
 * - BigInt, Symbol, Date, RegExp, Map, Set gibi özel tipleri işler
 * - Maksimum derinlik kontrolü ile stack overflow'u engeller
 *
 * @param data - Serileştirilecek veri
 * @param options - Serileştirme opsiyonları
 * @param options.pretty - Formatlı/okunaklı çıktı (varsayılan: false)
 * @param options.maxDepth - Maksimum nesne derinliği (varsayılan: sınırsız)
 * @returns JSON string
 *
 * @example
 * const obj = { user: { name: 'Ali' } };
 * obj.self = obj; // circular reference
 *
 * toJSON(obj);                    // '{"user":{"name":"Ali"},"self":"[Circular]"}'
 * toJSON(obj, { pretty: true });  // Formatlı çıktı
 * toJSON(obj, { maxDepth: 2 });   // Derinlik sınırlı
 */
export declare function toJSON(data: any, options?: {
    pretty?: boolean;
    maxDepth?: number;
}): string;
//# sourceMappingURL=common-helpers.d.ts.map