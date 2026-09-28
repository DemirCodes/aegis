// ============================================================
// utils/metric-helpers.ts
// ============================================================

import { AppError } from '@aegis/core';

/**
 * README: "Cache Map<string, Metrics> ile tutulur"
 * "Metric instance'ları singleton'dır. Her çağrıda aynı obje döner"
 * Cache'te varsa döner, yoksa factory ile üretip cache'e koyar.
 */
export function getOrCreateCacheEntry<T>(
  cache: Map<string, T>,
  key: string,
  factory: () => T
): T {
  const existing = cache.get(key);
  if (existing !== undefined) return existing;

  const created = factory();
  cache.set(key, created);
  return created;
}

/**
 * README: "metricPrefix: 'aegis_'"
 * "Metrik adları snake_case"
 * Metrik adını prefix ile normalize eder.
 */
export function normalizeMetricName(name: string, prefix: string): string {
  if (!name) return prefix;
  if (name.startsWith(prefix)) return name;
  return `${prefix}${name}`;
}

/**
 * README: "Aynı metric + farklı label key → AppError('LABEL_MISMATCH', ...)"
 * NOT: @aegis/core ErrorCodes'da 'LABEL_MISMATCH' tanımlı olmadığı için
 * mevcut 'VALIDATION_ERROR' kodu kullanılır (semantik olarak doğru).
 */
export function validateLabelSet(
  metricName: string,
  existingKeys: string[],
  newKeys: string[]
): void {
  if (existingKeys.length !== newKeys.length) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: `Label keys mismatch for metric "${metricName}"`,
      statusCode: 400,
    });
  }

  const existingSet = new Set(existingKeys);
  for (const key of newKeys) {
    if (!existingSet.has(key)) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: `Label key "${key}" not found in existing set for metric "${metricName}"`,
        statusCode: 400,
      });
    }
  }
}

/**
 * README: "Endpoint+method başına singleton (cache'li)"
 * Birden fazla parçayı ':' ile birleştirip cache key üretir.
 */
export function buildCacheKey(...parts: string[]): string {
  return parts.filter(Boolean).join(':');
}