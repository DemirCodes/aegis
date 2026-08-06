// ============================================
// @aegis/audit - Audit Helpers
// ============================================

import crypto from 'crypto';

/**
 * Değişiklikleri karşılaştır ve { old, new } formatına dönüştür
 */
export function diffChanges(oldData: Record<string, any>, newData: Record<string, any>, excludeFields: string[] = []): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {};
  const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);

  for (const key of allKeys) {
    if (excludeFields.includes(key)) continue;

    const oldValue = oldData?.[key];
    const newValue = newData?.[key];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = { old: oldValue, new: newValue };
    }
  }

  return changes;
}

/**
 * Hassas verileri maskele (password, creditCard, etc.)
 */
export function maskSensitiveData(data: Record<string, any>, sensitiveFields: string[] = []): Record<string, any> {
  const masked = { ...data };
  const defaultSensitive = ['password', 'creditCard', 'ssn', 'secret', 'token'];

  for (const key of Object.keys(masked)) {
    if (sensitiveFields.includes(key) || defaultSensitive.includes(key)) {
      masked[key] = '[REDACTED]';
    }
  }

  return masked;
}

/**
 * Değişiklik özeti oluştur (human-readable)
 */
export function generateChangesSummary(changes: Record<string, { old: any; new: any }>): string {
  const parts: string[] = [];

  for (const [field, { old: oldVal, new: newVal }] of Object.entries(changes)) {
    parts.push(`${field}: "${oldVal}" → "${newVal}"`);
  }

  return parts.join(', ');
}

/**
 * Request'ten IP adresini al
 */
export function getClientIp(req: any): string {
  return req?.ip || req?.socket?.remoteAddress || req?.connection?.remoteAddress || 'unknown';
}

/**
 * Request'ten User-Agent al
 */
export function getUserAgent(req: any): string {
  return req?.headers?.['user-agent'] || 'unknown';
}

/**
 * Audit ID oluştur
 */
export function generateAuditId(): string {
  return `audit_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
}