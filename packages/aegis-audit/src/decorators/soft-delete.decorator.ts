// ============================================
// @aegis/audit - @SoftDelete Decorator
// ============================================

import { PrismaClient } from '@prisma/client';
import { AuditTrailService } from '../services/audit-trail.service';

let prismaClient: PrismaClient | null = null;
let auditService: AuditTrailService | null = null;

/**
 * Soft delete servislerini initialize et
 */
export function initializeSoftDelete(prisma: PrismaClient, audit?: AuditTrailService) {
  prismaClient = prisma;
  if (audit) {
    auditService = audit;
  }
}

/**
 * Entity'yi soft delete yapan decorator
 * Silmek yerine deletedAt timestamp'ini set eder
 * Aynı zamanda audit trail'e kaydeder
 */
export function SoftDelete() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (!prismaClient) {
        throw new Error('PrismaClient not initialized. Call initializeSoftDelete() first.');
      }

      const entityId = args[0];
      const entityType = target.constructor.name.replace('Service', '').toLowerCase();

      if (!entityId) {
        throw new Error('Entity ID is required for soft delete');
      }

      try {
        // Önce entity'nin var olduğunu kontrol et
        const existing = await (prismaClient as any)[entityType].findUnique({
          where: { id: entityId },
        });

        if (!existing) {
          throw new Error(`${entityType} with id ${entityId} not found`);
        }

        // Zaten silinmiş mi kontrol et
        if (existing.deletedAt) {
          throw new Error(`${entityType} with id ${entityId} is already deleted`);
        }

        // Soft delete: deletedAt'i güncelle
        const result = await (prismaClient as any)[entityType].update({
          where: { id: entityId },
          data: { deletedAt: new Date() },
        });

        // Audit trail'e kaydet
        if (auditService) {
          const userId = args[1]?.userId || 'system';
          await auditService.createAuditLog(
            userId,
            entityType,
            'DELETE',
            { deletedAt: new Date().toISOString(), previousData: existing },
            { customFields: { entityId, method: 'softDelete' } },
          );
        }

        return result;
      } catch (error) {
        // Orijinal metodu çağırmayı dene (failover)
        if ((error as Error).message.includes('not initialized')) {
          throw error;
        }
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}