/**
 * İki obje arasındaki değişiklikleri { old, new } formatında çıkarır
 *
 * @param oldData - Eski veri (değişiklikten önceki hal)
 * @param newData - Yeni veri (değişiklikten sonraki hal)
 * @param excludeFields - Karşılaştırma dışı bırakılacak alanlar (opsiyonel)
 *
 * @returns Record<string, { old: any; new: any }> - Değişen alanların listesi
 *
 * @example
 * ```typescript
 * const oldData = { name: 'Ali', age: 25, password: 'secret123' };
 * const newData = { name: 'Ali', age: 26, password: 'secret123' };
 *
 * const changes = diffChanges(oldData, newData, ['password']);
 * // Sonuç: { age: { old: 25, new: 26 } }
 * // password exclude edildiği için karşılaştırılmadı
 * ```
 */
export declare function diffChanges(oldData: Record<string, any>, newData: Record<string, any>, excludeFields?: string[]): Record<string, {
    old: any;
    new: any;
}>;
/**
 * Hassas verileri maskele (password, token, creditCard vb.)
 * İç içe objelerde de recursive olarak çalışır
 *
 * @param data - Maskelenecek veri
 * @param sensitiveFields - Ek hassas alan isimleri (opsiyonel)
 *
 * @returns Record<string, any> - Maskelenmiş veri
 *
 * @example
 * ```typescript
 * const data = {
 *   name: 'Ali',
 *   password: 'secret123',
 *   creditCard: '4111111111111111',
 *   address: { city: 'Istanbul', postalCode: '34000' },
 *   profile: { token: 'abc123', nickname: 'ali_34' }
 * };
 *
 * const masked = maskSensitiveData(data);
 * // Sonuç: {
 * //   name: 'Ali',
 * //   password: '[REDACTED]',
 * //   creditCard: '[REDACTED]',
 * //   address: { city: 'Istanbul', postalCode: '34000' },
 * //   profile: { token: '[REDACTED]', nickname: 'ali_34' }
 * // }
 * // password, creditCard ve profile.token maskelendi
 * ```
 */
export declare function maskSensitiveData(data: Record<string, any>, sensitiveFields?: string[]): Record<string, any>;
/**
 * Değişikliklerin insan tarafından okunabilir özetini oluşturur
 * Uzun değerleri otomatik kısaltır
 *
 * @param changes - diffChanges()'ten dönen değişiklik objesi
 * @param maxLength - Her değer için maksimum karakter (varsayılan: 50)
 *
 * @returns string - Okunabilir özet metni
 *
 * @example
 * ```typescript
 * const changes = {
 *   email: { old: 'old@email.com', new: 'new@email.com' },
 *   bio: { old: 'Merhaba ben Ali', new: 'Çok uzun bir biyografi...' }
 * };
 *
 * const summary = generateChangesSummary(changes);
 * // Sonuç: 'email: "old@email.com" → "new@email.com", bio: "Merhaba ben Ali" → "Çok uzun bir biy..."'
 * // bio alanı 50 karakterden uzunsa kırpıldı
 * ```
 */
export declare function generateChangesSummary(changes: Record<string, {
    old: any;
    new: any;
}>, maxLength?: number): string;
/**
 * Request'ten IP adresini alır
 * Proxy arkasında X-Forwarded-For header'ını da kontrol eder
 *
 * @param req - Express Request objesi
 *
 * @returns string - IP adresi (bulunamazsa 'unknown')
 *
 * @example
 * ```typescript
 * // Normal durumda:
 * const ip = getClientIp(req);
 * // '192.168.1.1'
 *
 * // Proxy arkasında (X-Forwarded-For: '203.0.113.5, 10.0.0.1'):
 * const ip = getClientIp(req);
 * // '203.0.113.5' (ilk IP gerçek kullanıcı IP'sidir)
 *
 * // Cloudflare arkasında (CF-Connecting-IP: '198.51.100.7'):
 * const ip = getClientIp(req);
 * // '198.51.100.7'
 * ```
 */
export declare function getClientIp(req: any): string;
/**
 * Request'ten User-Agent header'ını alır
 *
 * @param req - Express Request objesi
 *
 * @returns string - Tarayıcı/istemci bilgisi (bulunamazsa 'unknown')
 *
 * @example
 * ```typescript
 * const userAgent = getUserAgent(req);
 * // 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0'
 * ```
 */
export declare function getUserAgent(req: any): string;
/**
 * Benzersiz audit log ID'si oluşturur
 *
 * @returns string - Format: audit_[16 karakter hex]
 *
 * @example
 * ```typescript
 * const id = generateAuditId();
 * // 'audit_a1b2c3d4e5f6a7b8'
 * // Her çağrıda benzersizdir
 * ```
 */
export declare function generateAuditId(): string;
//# sourceMappingURL=audit-helpers.d.ts.map