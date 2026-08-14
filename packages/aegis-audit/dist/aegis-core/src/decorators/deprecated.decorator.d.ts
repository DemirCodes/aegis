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
export declare function Deprecated(message?: string, version?: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
//# sourceMappingURL=deprecated.decorator.d.ts.map