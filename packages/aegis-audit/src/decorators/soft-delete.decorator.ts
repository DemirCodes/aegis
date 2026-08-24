// ============================================
// @aegis/audit - @SoftDelete Decorator
// SoftDeleteService'e bağlı güçlendirilmiş hali
// ============================================

import { PrismaClient } from '@prisma/client';
import { AuditTrailService } from '../services/audit-trail.service';
import { SoftDeleteService } from '../services/soft-delete.service';
import { logger, AppError } from '@aegis/core';

let softDeleteService: SoftDeleteService | null = null;

/**
 * Soft delete servislerini initialize et
 * @param prisma - PrismaClient instance'ı
 * @param audit - AuditTrailService (opsiyonel)
 */
export function initializeSoftDelete(prisma: PrismaClient, audit?: AuditTrailService) {
  const auditService = audit || new AuditTrailService(prisma);
  softDeleteService = new SoftDeleteService(prisma, auditService);
}

/**
 * Entity'yi soft delete yapan decorator
 * Silmek yerine deletedAt timestamp'ini set eder
 * SoftDeleteRegistry'ye kaydeder ve audit trail'e loglar
 * 
 * @example
 * class UserService {
 *   @SoftDelete()
 *   async deleteUser(id: string, context?: { userId?: string; reason?: string }) {
 *     // Bu metod çağrıldığında otomatik soft delete yapılır
 *     // Silme işlemi SoftDeleteService üzerinden yürütülür
 *   }
 * }
 */
export function SoftDelete() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (!softDeleteService) {
        throw new AppError({
          code: 'INTERNAL_ERROR',
          message: 'SoftDeleteService not initialized. Call initializeSoftDelete() first.',
          statusCode: 500,
        });
      }

      // Argümanlardan bilgileri çıkar
      const entityId = args[0]; // İlk argüman entity ID'si olmalı
      const context = args[1];  // İkinci argüman context (userId, reason)

      // Entity tipini constructor adından çıkar
      const entityType = target.constructor.name.replace('Service', '');

      if (!entityId) {
        throw new AppError({
          code: 'VALIDATION_ERROR',
          message: 'Entity ID is required for soft delete',
          statusCode: 400,
        });
      }

      const deletedBy = context?.userId || 'system';
      const reason = context?.reason;

      try {
        // SoftDeleteService üzerinden soft delete yap
        const result = await softDeleteService.softDelete(
          entityType,
          entityId,
          deletedBy,
          reason,
        );

        // Eğer kayıt bulunamadıysa hata fırlat
        if (result.status === 'not_found') {
          throw new AppError({
            code: 'NOT_FOUND',
            message: `${entityType} with id ${entityId} not found`,
            statusCode: 404,
          });
        }

        logger.info('Soft delete decorator completed', {
          entityType,
          entityId,
          status: result.status,
        });

        // Orijinal metodu çağır (varsa ek iş mantığı)
        if (originalMethod) {
          return await originalMethod.apply(this, args);
        }

        return result;
      } catch (error) {
        logger.error('Soft delete decorator failed', error as Error, {
          entityType,
          entityId,
        });

        // Not initialized hatası ise yeniden fırlat
        if ((error as Error).message.includes('not initialized')) {
          throw error;
        }

        // Orijinal metodu çağırmayı dene (failover)
        if (originalMethod) {
          return await originalMethod.apply(this, args);
        }

        throw error;
      }
    };

    return descriptor;
  };
}