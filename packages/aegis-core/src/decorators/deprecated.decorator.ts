// ============================================
// @aegis/core - Deprecated Decorator
// Metod/sınıf kullanımdan kaldırma dekoratörü
// ============================================

import { logger } from '../utils/logger';

/**
 * @Deprecated Dekoratörü
 * 
 * Bir metodun veya sınıfın artık kullanılmaması gerektiğini belirtir.
 * Çağrıldığında otomatik olarak uyarı log'u atar ve geliştiriciyi bilgilendirir.
 * 
 * @param message - Geliştiriciye gösterilecek alternatif/yönlendirme mesajı
 * @param version - Hangi versiyonda deprecated olduğu (opsiyonel - audit tracking için)
 * @returns Method Decorator
 * 
 * @example
 * class UserService {
 *   @Deprecated('Use getUserV2() instead', '1.2.0')
 *   getUser(id: string) {
 *     // eski implementasyon
 *   }
 * }
 */

export function Deprecated(message?: string, version?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Orijinal metodu referansla (çağrı zincirini kırmamak için)
    const originalMethod = descriptor.value;

    // Metodu wrap et (proxy pattern - davranışı değiştirmeden log ekle)
    descriptor.value = function (...args: any[]) {
      // Uyarı mesajını oluştur (custom veya default)
      const warningMsg = message || `${propertyKey}() is deprecated and will be removed in a future version.`;
      
      // Geliştiriciyi uyar (log ile)
      logger.warn(`[DEPRECATED] ${warningMsg}`, {
        method: propertyKey,                    // Hangi metod çağrıldı
        deprecatedSince: version || 'unknown',  // Hangi versiyonda kalktı
        className: target.constructor.name,     // Hangi sınıfa ait
        timestamp: new Date().toISOString(),    // Ne zaman çağrıldı
      });
      
      // Orijinal metodu orijinal argümanlarla çağır (this bağlamını koru)
      return originalMethod.apply(this, args);
    };

    // Dekore edilmiş metodu döndür
    return descriptor;
  };
}