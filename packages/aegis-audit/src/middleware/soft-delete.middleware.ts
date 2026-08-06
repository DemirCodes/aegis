// ============================================
// @aegis/audit - Soft Delete Middleware
// ============================================

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient | null = null;

/**
 * Soft delete middleware'ini initialize et
 */
export function initializeSoftDeleteMiddleware(prisma: PrismaClient) {
  prismaClient = prisma;
}

/**
 * Soft-delete edilmiş kayıtları filtreleyen middleware
 * Response çıktısındaki deletedAt alanı olan kayıtları filtreler
 */
export function softDeleteFilter(req: Request, res: Response, next: NextFunction) {
  // Sadece GET isteklerinde çalışsın
  if (req.method !== 'GET') {
    return next();
  }

  // Orijinal json metodunu sakla
  const originalJson = res.json.bind(res);

  // Response override
  res.json = function (data: any): Response {
    try {
      // Eğer veri array ise, soft-delete edilmişleri filtrele
      if (Array.isArray(data)) {
        const filtered = data.filter((item) => !item?.deletedAt);
        return originalJson(filtered);
      }

      // Eğer veri obje ise ve deletedAt varsa, 404 dön
      if (data && typeof data === 'object' && !Array.isArray(data) && data.deletedAt) {
        return res.status(404).json({ 
          error: 'Resource not found',
          message: 'This resource has been deleted',
        });
      }

      // Paginated sonuçları filtrele
      if (data && typeof data === 'object' && Array.isArray(data.data)) {
        data.data = data.data.filter((item: any) => !item?.deletedAt);
        data.total = data.data.length;
        return originalJson(data);
      }

      return originalJson(data);
    } catch (error) {
      // Bir şey ters giderse orijinal veriyi dön
      return originalJson(data);
    }
  } as any;

  next();
}

/**
 * Sadece soft-delete edilmiş kayıtları getiren middleware
 */
export function onlyDeletedFilter(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'GET') {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = function (data: any): Response {
    try {
      if (Array.isArray(data)) {
        const deleted = data.filter((item) => !!item?.deletedAt);
        return originalJson(deleted);
      }

      if (data && typeof data === 'object' && Array.isArray(data.data)) {
        data.data = data.data.filter((item: any) => !!item?.deletedAt);
        data.total = data.data.length;
        return originalJson(data);
      }

      return originalJson(data);
    } catch (error) {
      return originalJson(data);
    }
  } as any;

  next();
}