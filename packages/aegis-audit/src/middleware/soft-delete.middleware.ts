// ============================================
// @aegis/audit - Soft Delete Middleware
// ============================================

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuditTrailService } from '../services/audit-trail.service';
import { SoftDeleteService } from '../services/soft-delete.service';
import { logger, AppError } from '@aegis/core';

let prismaClient: PrismaClient | null = null;
let softDeleteService: SoftDeleteService | null = null;


/**
 * Soft delete middleware'ini initialize et
 * @param prisma - PrismaClient instance'ı
 * @param audit - AuditTrailService (opsiyonel)
 */
export function initializeSoftDeleteMiddleware(prisma: PrismaClient, audit?: AuditTrailService) {
  const auditService = audit || new AuditTrailService(prisma);
  softDeleteService = new SoftDeleteService(prisma, auditService);
}


/**
 * Soft-delete edilmiş kayıtları filtreleyen middleware
 * Response çıktısındaki deletedAt alanı olan kayıtları gizler
 * Normal kullanıcılar silinmiş kayıtları görmemeli
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
      logger.error('Soft delete filter error', error as Error);
      return originalJson(data);
    }
  } as any;

  next();
}

/**
 * Sadece soft-delete edilmiş kayıtları getiren middleware
 * Admin paneli için silinmiş kayıtları listeleme
 * Anayasaya eklendi: onlyDeletedFilter
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
      logger.error('Only deleted filter error', error as Error);
      return originalJson(data);
    }
  } as any;

  next();
}


/**
 * SoftDeleteService üzerinden soft delete edilmiş kayıtları getiren handler
 * Admin API endpoint'i için
 * 
 * @example
 * app.get('/api/admin/deleted', getSoftDeletedRecordsHandler);
 */
export async function getSoftDeletedRecordsHandler(req: Request, res: Response, _next: NextFunction): Promise<void> {
  if (!softDeleteService) {
    res.status(500).json({ 
      error: 'SoftDeleteService not initialized',
      message: 'Call initializeSoftDeleteMiddleware() first',
    });
    return;
  }

  const { entityType, limit, offset, includeHardDeleted } = req.query;

  try {
    const records = await softDeleteService.getSoftDeletedRecords({
      entityType: entityType as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      includeHardDeleted: includeHardDeleted === 'true',
    });

    res.json({ success: true, data: records });
  } catch (error) {
    logger.error('Get soft deleted records failed', error as Error);
    res.status(500).json({ error: (error as Error).message });
  }
}