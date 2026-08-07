// ============================================
// @aegis/core - Common Helpers
// Genel amaçlı yardımcı fonksiyonlar
// ============================================

/**
 * Belirtilen süre kadar asenkron bekler (sleep)
 * @param ms - Beklenecek süre (milisaniye)
 * @returns Promise<void>
 * 
 * @example
 * await delay(5000); // 5 saniye bekle
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
export function toJSON(
  data: any,
  options?: { pretty?: boolean; maxDepth?: number }
): string {
  try {
    // Döngüsel referansları takip etmek için WeakMap (garbage collection'a izin verir)
    const seen = new WeakMap<any, boolean>();
    
    // Maksimum derinlik (varsayılan: sınırsız)
    const maxDepth = options?.maxDepth ?? Infinity;
    
    // Rekürsif serileştirme fonksiyonu
    function serialize(obj: any, currentDepth: number = 0): any {
      // Maksimum derinlik aşıldıysa dur
      if (currentDepth > maxDepth) {
        return '[MaxDepth Reached]';
      }
      
      // null kontrolü (typeof null === 'object' olduğu için önce kontrol edilmeli)
      if (obj === null) return null;
      
      // BigInt ve Symbol'leri string'e çevir (JSON standardında yoklar)
      if (typeof obj === 'bigint') return obj.toString();
      if (typeof obj === 'symbol') return obj.toString();
      
      // Primitive değerler direkt döndürülür
      if (typeof obj !== 'object') return obj;
      
      // Döngüsel referans kontrolü
      if (seen.has(obj)) return '[Circular]';
      seen.set(obj, true);
      
      // Date -> ISO 8601 string
      if (obj instanceof Date) return obj.toISOString();
      
      // RegExp -> string
      if (obj instanceof RegExp) return obj.toString();
      
      // Map -> plain object
      if (obj instanceof Map) {
        const result: Record<string, any> = {};
        obj.forEach((value, key) => {
          result[String(key)] = serialize(value, currentDepth + 1);
        });
        return result;
      }
      
      // Set -> array
      if (obj instanceof Set) {
        return Array.from(obj).map(item => serialize(item, currentDepth + 1));
      }
      
      // toJSON() metodu varsa onu kullan (Date, Mongoose document vb.)
      if (typeof obj.toJSON === 'function') return obj.toJSON();
      
      // Array -> her elemanı serialize et
      if (Array.isArray(obj)) {
        return obj.map(item => serialize(item, currentDepth + 1));
      }
      
      // Normal object -> her property'yi serialize et
      const result: Record<string, any> = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = serialize(obj[key], currentDepth + 1);
        }
      }
      return result;
    }
    
    // Serileştir ve JSON string'e çevir
    const serialized = serialize(data);
    return JSON.stringify(serialized, null, options?.pretty ? 2 : undefined);
    
  } catch (error) {
    // Serileştirme başarısız olursa hata bilgisini JSON olarak döndür
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`toJSON serialization failed: ${errorMessage}`, data);
    
    return JSON.stringify({
      error: 'Serialization failed',
      message: errorMessage,
      type: typeof data,
    });
  }
}