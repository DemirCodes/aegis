// ============================================
// @aegis/core - Mask Helpers
// Hassas veri maskeleme (token-based match)
// ============================================

/**
 * Log'da ve audit'te maskelenmesi gereken varsayılan hassas alan listesi
 * 
 * Match stratejisi: token-based (camelCase/snake_case/kebab-case sınırlarından bölünür)
 * - "userPassword" → ["user", "password"] → "password" eşleşir ✅
 * - "api_key" → ["api", "key"] → "key" eşleşir ✅
 * - "monkey" → ["monkey"] → eşleşmez ✅
 */
export const DEFAULT_SENSITIVE_FIELDS = [
  // Kimlik doğrulama
  'password', 'passwd', 'pwd',
  'secret', 'token', 'apiKey', 'privateKey',
  'authorization', 'auth',
  // Finansal
  'creditCard', 'card', 'cvv', 'cvc',
  'iban', 'accountNumber',
  // Kişisel (PII)
  'ssn', 'passport', 'nationalId',
  // Genel
  'key', 'credential',
] as const;

const REDACTED = '[REDACTED]';

/**
 * Alan adını token'lara böler
 * - camelCase: userPassword → ['user', 'Password']
 * - snake_case: api_key → ['api', 'key']
 * - kebab-case: credit-card → ['credit', 'card']
 * - PascalCase: UserPassword → ['User', 'Password']
 * 
 * @param fieldName - Alan adı
 * @returns Token dizisi (lowercase normalize edilmiş)
 */
function tokenizeField(fieldName: string): string[] {
  return fieldName
    // snake_case ve kebab-case ayraçlarını boşlukla değiştir
    .replace(/[_-]/g, ' ')
    // camelCase / PascalCase sınırlarına boşluk ekle (küçük harf → büyük harf)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // boşluklardan böl ve lowercase yap
    .split(/\s+/)
    .map(t => t.toLowerCase())
    .filter(Boolean);
}

/**
 * Alan adının hassas olup olmadığını token bazlı kontrol eder
 * 
 * @param fieldName - Kontrol edilecek alan adı
 * @param sensitiveFields - Hassas alan listesi
 * @returns Hassas ise true
 */
function isSensitiveField(fieldName: string, sensitiveFields: readonly string[]): boolean {
  const tokens = tokenizeField(fieldName);
  const sensitiveLower = sensitiveFields.map(s => s.toLowerCase());
  return tokens.some(token => sensitiveLower.includes(token));
}

/**
 * Verilen obje içindeki hassas alanları maskeler (recursive)
 * 
 * - Orijinal objeyi MUTASYONA UĞRATMAZ (yeni kopya döner)
 * - Nested objelerde recursive çalışır
 * - Array'lerdeki objeleri de işler
 * - `null` ve primitive değerler olduğu gibi döner
 * 
 * @param data - Maskelenecek veri
 * @param sensitiveFields - Ek hassas alan listesi (varsayılan: DEFAULT_SENSITIVE_FIELDS)
 * @returns Maskelenmiş veri (yeni obje)
 * 
 * @example
 * maskSensitiveData({ password: 'x', name: 'Ali' })
 * // { password: '[REDACTED]', name: 'Ali' }
 * 
 * @example
 * maskSensitiveData({ user: { apiKey: 'abc', id: 1 } })
 * // { user: { apiKey: '[REDACTED]', id: 1 } }
 */
export function maskSensitiveData(
  data: any,
  sensitiveFields: readonly string[] = DEFAULT_SENSITIVE_FIELDS,
): any {
  // null, undefined, primitive → olduğu gibi döner
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }

  // Array → her elemanı maskeler
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item, sensitiveFields));
  }

  // Date, RegExp gibi özel objeler → olduğu gibi döner
  if (data instanceof Date || data instanceof RegExp) {
    return data;
  }

  // Normal obje → her alanı kontrol eder
  const result: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    if (isSensitiveField(key, sensitiveFields)) {
      result[key] = REDACTED;
    } else {
      result[key] = maskSensitiveData(data[key], sensitiveFields);
    }
  }
  return result;
}