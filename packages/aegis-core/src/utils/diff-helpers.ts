// ============================================
// @aegis/core - Diff Helpers
// İki obje arasındaki değişiklikleri tespit eder
// ============================================

import type { ChangesMap } from '../types/common.types';

/**
 * İki obje arasındaki farkı çıkarır
 * 
 * - Sadece DEĞİŞEN alanları döner (aynı olanlar atlanır)
 * - Nested objelerde recursive değil, shallow diff yapar (üst seviye alan bazında)
 * - `excludeFields` listesindeki alanlar görmezden gelinir
 * - Yeni eklenen alanlar: { old: undefined, new: value }
 * - Silinen alanlar: { old: value, new: undefined }
 * 
 * @param oldData - Eski veri
 * @param newData - Yeni veri
 * @param excludeFields - Hariç tutulacak alanlar
 * @returns Değişiklikler map'i
 * 
 * @example
 * diffChanges({ name: 'Ali', age: 25 }, { name: 'Ali', age: 26 })
 * // { age: { old: 25, new: 26 } }
 * 
 * @example
 * diffChanges({ a: 1, b: 2 }, { a: 1, b: 3 }, ['a'])
 * // { b: { old: 2, new: 3 } }
 */
export function diffChanges(
  oldData: any,
  newData: any,
  excludeFields: string[] = [],
): ChangesMap {
  const changes: ChangesMap = {};

  // null/undefined kontrolü — biri yoksa direkt döner
  if (!oldData || typeof oldData !== 'object') oldData = {};
  if (!newData || typeof newData !== 'object') newData = {};

  // Tüm anahtarları topla (eski + yeni)
  const allKeys = new Set([
    ...Object.keys(oldData),
    ...Object.keys(newData),
  ]);

  for (const key of allKeys) {
    // Hariç tutulan alanları atla
    if (excludeFields.includes(key)) continue;

    const oldValue = oldData[key];
    const newValue = newData[key];

    // Değişiklik yoksa atla
    if (!hasChanged(oldValue, newValue)) continue;

    changes[key] = { old: oldValue, new: newValue };
  }

  return changes;
}

/**
 * İki değerin farklı olup olmadığını kontrol eder
 * - Date → getTime() karşılaştırması
 * - Array → uzunluk + eleman karşılaştırması (basit)
 * - Object → JSON.stringify karşılaştırması (basit)
 * - Primitive → === karşılaştırması
 */
function hasChanged(oldValue: any, newValue: any): boolean {
  // Aynı referans → değişmemiş
  if (oldValue === newValue) return false;

  // Date karşılaştırması
  if (oldValue instanceof Date && newValue instanceof Date) {
    return oldValue.getTime() !== newValue.getTime();
  }

  // null/undefined farkı
  if (oldValue === null || oldValue === undefined) return true;
  if (newValue === null || newValue === undefined) return true;

  // Array karşılaştırması
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    if (oldValue.length !== newValue.length) return true;
    return oldValue.some((v, i) => hasChanged(v, newValue[i]));
  }

  // Object karşılaştırması
  if (typeof oldValue === 'object' && typeof newValue === 'object') {
    return JSON.stringify(oldValue) !== JSON.stringify(newValue);
  }

  // Primitive değerler
  return oldValue !== newValue;
}

/**
 * Değişiklik map'ini okunabilir tek satır özet yapar
 * 
 * @param changes - diffChanges() çıktısı
 * @param maxLength - Maksimum karakter uzunluğu (aşılırsa kesilir ve "..." eklenir)
 * @returns Okunabilir özet string
 * 
 * @example
 * formatChangesSummary({ age: { old: 25, new: 26 } })
 * // 'age: 25 → 26'
 * 
 * @example
 * formatChangesSummary({ a: { old: 1, new: 2 }, b: { old: 3, new: 4 } })
 * // 'a: 1 → 2; b: 3 → 4'
 */
export function formatChangesSummary(
  changes: ChangesMap,
  maxLength: number = 200,
): string {
  const parts = Object.entries(changes).map(([field, { old, new: newVal }]) => {
    const oldStr = stringifyValue(old);
    const newStr = stringifyValue(newVal);
    return `${field}: ${oldStr} → ${newStr}`;
  });

  const summary = parts.join('; ');
  return summary.length > maxLength
    ? summary.substring(0, maxLength - 3) + '...'
    : summary;
}

/**
 * Değeri kısa string'e çevirir (null, object, array vb. için)
 */
function stringifyValue(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'object') {
    try {
      const str = JSON.stringify(value);
      return str.length > 50 ? str.substring(0, 47) + '...' : str;
    } catch {
      return '[Object]';
    }
  }
  return String(value);
}