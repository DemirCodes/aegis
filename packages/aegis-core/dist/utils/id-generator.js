"use strict";
// ============================================
// @aegis/core - ID Generator
// Unique ID ve UUID üretimi için yardımcı fonksiyonlar
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.generateUUID = generateUUID;
const crypto_1 = require("crypto");
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
function generateId(prefix, length = 12) {
    // crypto.randomUUID() - Node.js native, ek paket gerektirmez
    const id = (0, crypto_1.randomUUID)().replace(/-/g, '').substring(0, Math.min(length, 32));
    // Prefix varsa ekle, yoksa sadece ID'yi döndür
    return prefix ? `${prefix}_${id}` : id;
}
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
function generateUUID() {
    return (0, crypto_1.randomUUID)();
}
//# sourceMappingURL=id-generator.js.map