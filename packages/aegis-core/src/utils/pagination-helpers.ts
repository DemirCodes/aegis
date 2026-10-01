// ============================================
// @aegis/core - Pagination Helpers
// Sayfalama parametrelerini normalize eder
// ============================================

import type { PaginationOptions } from '../types/common.types';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/app-constants';

/**
 * Normalize edilmiş sayfalama çıktısı
 */
export type NormalizedPagination = {
  page: number;       // Sayfa numarası (1-indexed)
  pageSize: number;   // Sayfa başına kayıt
  offset: number;     // Atlanacak kayıt sayısı (Prisma/TypeORM skip)
  limit: number;      // Alınacak kayıt sayısı (= pageSize)
};

/**
 * Sayfalama parametrelerini güvenli aralığa normalize eder
 * 
 * - `page` yoksa → 1
 * - `page` < 1 ise → 1
 * - `pageSize` yoksa → DEFAULT_PAGE_SIZE (20)
 * - `pageSize` < 1 ise → DEFAULT_PAGE_SIZE
 * - `pageSize` > MAX_PAGE_SIZE ise → MAX_PAGE_SIZE (100)
 * 
 * @param options - Ham sayfalama parametreleri
 * @returns Normalize edilmiş sayfalama (page, pageSize, offset, limit)
 * 
 * @example
 * normalizePagination()
 * // { page: 1, pageSize: 20, offset: 0, limit: 20 }
 * 
 * @example
 * normalizePagination({ page: 3, pageSize: 50 })
 * // { page: 3, pageSize: 50, offset: 100, limit: 50 }
 * 
 * @example
 * normalizePagination({ pageSize: 9999 })
 * // { page: 1, pageSize: 100, offset: 0, limit: 100 }  // MAX_PAGE_SIZE ile sınırlandı
 */
export function normalizePagination(
  options?: PaginationOptions,
): NormalizedPagination {
  // page: 1'den küçük olamaz
  const rawPage = options?.page ?? 1;
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  // pageSize: 1 ile MAX_PAGE_SIZE arasında olmalı
  const rawPageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  let pageSize = Number.isFinite(rawPageSize) && rawPageSize >= 1
    ? Math.floor(rawPageSize)
    : DEFAULT_PAGE_SIZE;
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
}