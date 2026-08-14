/**
 * Prefix'li veya prefix'siz unique ID üretir
 * crypto.randomUUID() kullanarak unique ID oluşturur
 *
 * @param prefix - ID'ye eklenecek önek (örn: 'user', 'order') - opsiyonel
 * @param length - ID'nin karakter uzunluğu (varsayılan: 12, maksimum: 32)
 * @returns Unique ID string'i
 *
 * @example
 * generateId('user')      // 'user_a1b2c3d4e5f6'
 * generateId('order', 16) // 'order_a1b2c3d4e5f6g7h8'
 * generateId()            // 'a1b2c3d4e5f6'
 */
export declare function generateId(prefix?: string, length?: number): string;
/**
 * Standart UUID v4 üretir
 * RFC 4122 uyumlu, unique identifier
 *
 * @returns UUID v4 string'i (örn: '550e8400-e29b-41d4-a716-446655440000')
 *
 * @example
 * const id = generateUUID();
 * // '550e8400-e29b-41d4-a716-446655440000'
 */
export declare function generateUUID(): string;
//# sourceMappingURL=id-generator.d.ts.map