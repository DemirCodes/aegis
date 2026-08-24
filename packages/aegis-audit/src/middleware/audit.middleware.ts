// ============================================
// @aegis/audit - Audit Middleware
// Güçlendirilmiş hali: logger kullanımı
// ============================================

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuditTrailService } from '../services/audit-trail.service';
import { getClientIp, getUserAgent } from '../utils/audit-helpers';
import { logger } from '@aegis/core';

let auditService: AuditTrailService | null = null;

/**
 * Audit middleware'i initialize et
 * @param prisma - PrismaClient instance'ı
 * @param sensitiveFields - Ek hassas alanlar (opsiyonel)
 */
export function initializeAuditMiddleware(prisma: PrismaClient, sensitiveFields?: string[]) {
  auditService = new AuditTrailService(prisma, sensitiveFields);
}

/**
 * Tüm API isteklerini audit trail'e kaydeden middleware
 * Hassas endpoint'leri (login, register) log'lamaz
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  // Audit atlanacak mı?
  if ((req as any).__skipAudit) {
    return next();
  }

  const startTime = Date.now();

  // Response finish olduğunda log'la
  res.on('finish', async () => {
    if (!auditService) return;

    try {
      const duration = Date.now() - startTime;
      const { method, originalUrl } = req;
      const statusCode = res.statusCode;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);
      const userId = (req as any).user?.id || 'anonymous';

      // Health check ve metrics endpoint'lerini log'lama
      const skipEndpoints = ['/health', '/metrics', '/favicon.ico'];
      if (skipEndpoints.some((ep) => originalUrl.includes(ep))) {
        return;
      }

      // Hassas endpoint'leri log'lama
      const sensitiveEndpoints = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/token'];
      if (sensitiveEndpoints.some((ep) => originalUrl.includes(ep))) {
        return;
      }

      // Sadece 4xx ve 5xx hatalarını veya POST/PUT/DELETE işlemlerini log'la
      // GET isteklerini sadece hata durumunda log'la
      if (method === 'GET' && statusCode < 400) {
        return;
      }

      let action: 'CREATE' | 'UPDATE' | 'DELETE' = 'UPDATE';
      if (method === 'POST') action = 'CREATE';
      else if (method === 'DELETE') action = 'DELETE';

      await auditService.createAuditLog(
        userId,
        'API_REQUEST',
        action,
        {
          endpoint: originalUrl,
          method,
          statusCode,
          duration: `${duration}ms`,
        },
        {
          ipAddress,
          userAgent,
          correlationId: req.headers['x-correlation-id'] as string || req.headers['x-request-id'] as string,
        },
      );
    } catch (error) {
      // Audit log hatası uygulamayı etkilemesin
      logger.error('Audit middleware error', error as Error);
    }
  });

  next();
}

/**
 * Belirli endpoint'leri audit'ten hariç tutan middleware
 */
export function excludeFromAudit(paths: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (paths.some((p) => req.originalUrl.includes(p))) {
      (req as any).__skipAudit = true;
    }
    next();
  };
}