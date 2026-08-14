// ============================================
// @aegis/audit - Audit Helpers (Güçlendirilmiş)
// ============================================

import crypto from 'crypto';

// ────────────────────────────────────────────
// 1. diffChanges()
// ────────────────────────────────────────────

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
export function diffChanges(
  oldData: Record<string, any>,
  newData: Record<string, any>,
  excludeFields: string[] = []
): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {};
  
  // Her iki objeden tüm key'leri topla (Set ile unique olarak)
  const allKeys = new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {}),
  ]);

  for (const key of allKeys) {
    // exclude listesinde varsa atla
    if (excludeFields.includes(key)) continue;

    const oldValue = oldData?.[key];
    const newValue = newData?.[key];

    // Hızlı kontrol: referans eşitliği (aynı referans ise değişmemiştir)
    if (oldValue === newValue) continue;

    // Deep compare: JSON'a çevirip karşılaştır (nesne/array/diziler için)
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = { old: oldValue, new: newValue };
    }
  }

  return changes;
}

// ────────────────────────────────────────────
// 2. maskSensitiveData()
// ────────────────────────────────────────────

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
export function maskSensitiveData(
  data: Record<string, any>,
  sensitiveFields: string[] = []
): Record<string, any> {
  // Varsayılan hassas alanlar + kullanıcının ekledikleri
  const defaultSensitive = [
    'password',      // Şifre
    'creditCard',    // Kredi kartı
    'ssn',           // Sosyal güvenlik numarası
    'secret',        // Gizli anahtar
    'token',         // Token
    'apiKey',        // API anahtarı
    'privateKey',    // Özel anahtar
  ];

  const allSensitive = [...defaultSensitive, ...sensitiveFields];
  const masked: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    // Hassas alan mı? (case-insensitive kontrol)
    if (allSensitive.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      masked[key] = '[REDACTED]';
    }
    // İç içe obje varsa recursive maskele (Date hariç, Array hariç)
    else if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      masked[key] = maskSensitiveData(value, sensitiveFields);
    }
    // Normal değer
    else {
      masked[key] = value;
    }
  }

  return masked;
}

// ────────────────────────────────────────────
// 3. generateChangesSummary()
// ────────────────────────────────────────────

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
export function generateChangesSummary(
  changes: Record<string, { old: any; new: any }>,
  maxLength: number = 50
): string {
  const parts: string[] = [];

  for (const [field, { old: oldVal, new: newVal }] of Object.entries(changes)) {
    const oldStr = truncateValue(oldVal, maxLength);
    const newStr = truncateValue(newVal, maxLength);
    parts.push(`${field}: "${oldStr}" → "${newStr}"`);
  }

  return parts.join(', ');
}

/**
 * Değeri string'e çevirip belirli uzunlukta kısaltır (özel yardımcı)
 */
function truncateValue(value: any, maxLength: number): string {
  const str =
    typeof value === 'object' ? JSON.stringify(value) : String(value ?? 'null');
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

// ────────────────────────────────────────────
// 4. getClientIp()
// ────────────────────────────────────────────

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
export function getClientIp(req: any): string {
  // X-Forwarded-For header'ı (proxy arkası, ilk IP gerçek kullanıcıdır)
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Cloudflare bağlantı IP'si
  const cfIp = req?.headers?.['cf-connecting-ip'];
  if (cfIp) return cfIp;

  // Standart Express IP
  return (
    req?.ip ||
    req?.socket?.remoteAddress ||
    req?.connection?.remoteAddress ||
    'unknown'
  );
}

// ────────────────────────────────────────────
// 5. getUserAgent()
// ────────────────────────────────────────────

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
export function getUserAgent(req: any): string {
  return req?.headers?.['user-agent'] || 'unknown';
}

// ────────────────────────────────────────────
// 6. generateAuditId()
// ────────────────────────────────────────────

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
export function generateAuditId(): string {
  return `audit_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
}