// ============================================
// @aegis/core - ID Generator
// Unique ID ve UUID üretimi için yardımcı fonksiyonlar
// ============================================

import { randomUUID } from 'crypto';

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
export function generateId(prefix?: string, length: number = 12): string {
  // crypto.randomUUID() - Node.js native, ek paket gerektirmez
  const id = randomUUID().replace(/-/g, '').substring(0, Math.min(length, 32));
  
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
export function generateUUID(): string {
  return randomUUID();
}