// ============================================
// @aegis/audit - @Audited Decorator
// AuditTrailService'e bağlı güçlendirilmiş hali
// ============================================

import { PrismaClient } from '@prisma/client';
import { AuditTrailService } from '../services/audit-trail.service';
import { diffChanges, getClientIp, getUserAgent } from '../utils/audit-helpers';
import { logger, AppError } from '@aegis/core';
import type { AuditedOptions } from '../types/audit.types';

let auditService: AuditTrailService | null = null;

/**
 * Audit servisini initialize et
 * @param prisma - PrismaClient instance'ı
 * @param sensitiveFields - Ek hassas alanlar (opsiyonel)
 */
export function initializeAudit(prisma: PrismaClient, sensitiveFields?: string[]) {
  auditService = new AuditTrailService(prisma, sensitiveFields);
}

/**
 * Metod çağrılarını otomatik audit trail'e kaydeden decorator
 * 
 * @param options - Audit seçenekleri
 * @param options.include - Hangi field'lar log'lansın (whitelist)
 * @param options.exclude - Hangi field'lar log'lanmasın (blacklist)
 * @param options.trackDeletes - Delete işlemleri track edilsin mi?
 * @param options.sensitive - Hassas veri işleme modu
 * @param options.customFields - Ekstra metadata
 * 
 * @example
 * class UserService {
 *   @Audited({ exclude: ['password'] })
 *   async updateUser(id: string, data: UpdateUserDto) {
 *     // Password field'ı log'lanmayacak
 *   }
 * }
 */



export function Audited(options: AuditedOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const { 
        include, 
        exclude = [], 
        trackDeletes = true, 
        sensitive = false, 
        customFields 
      } = options;

      // Audit servisi yoksa orijinal metodu çağır (failover)
      if (!auditService) {
        logger.warn('Audit service not initialized, skipping audit log', {
          method: propertyKey,
        });
        return originalMethod.apply(this, args);
      }

      const startTime = Date.now();
      let result: any;

      try {
        // Metodu çağır
        result = await originalMethod.apply(this, args);

        // Entity bilgilerini çıkar
        const entityType = target.constructor.name.replace('Service', '');
        
        // İlk argüman genelde entity ID'sidir
        const firstArg = args[0];
        const entityId = typeof firstArg === 'string' 
          ? firstArg 
          : (result?.id || result?.orderNumber || 'unknown');

        // Request context'ini bul (Express req genelde son parametredir)
        const req = args[args.length - 1];
        const isRequest = req && typeof req === 'object' && (req.ip || req.headers || req.socket);
        
        const ipAddress = isRequest ? getClientIp(req) : undefined;
        const userAgent = isRequest ? getUserAgent(req) : undefined;
        const userId = isRequest && req.user?.id ? req.user.id : 'system';
        const correlationId = isRequest && req.headers?.['x-correlation-id'] 
          ? req.headers['x-correlation-id'] 
          : undefined;

        // Aksiyonu belirle
        let action: 'CREATE' | 'UPDATE' | 'DELETE' = 'UPDATE';
        if (propertyKey.startsWith('create') || propertyKey.startsWith('add')) {
          action = 'CREATE';
        } else if (propertyKey.startsWith('delete') || propertyKey.startsWith('remove')) {
          if (!trackDeletes) return result;
          action = 'DELETE';
        }

        // Değişiklikleri hesapla (önceki veri yoksa boş obje kullan)
        const oldData = args[1] || {};
        const changes = diffChanges(oldData, result || {}, exclude);

        // Eğer include varsa sadece o field'ları al
        let filteredChanges = changes;
        if (include?.length) {
          filteredChanges = {};
          for (const key of include) {
            if (changes[key]) {
              filteredChanges[key] = changes[key];
            }
          }
        }

        // Eğer değişiklik yoksa ve CREATE değilse log'lama
        if (Object.keys(filteredChanges).length === 0 && action !== 'CREATE') {
          return result;
        }

        // Audit log oluştur
        await auditService.createAuditLog(
          userId,
          entityType,
          action,
          sensitive ? { changes: '[SENSITIVE DATA]' } : filteredChanges,
          {
            ipAddress,
            userAgent,
            correlationId,
            customFields: {
              entityId,
              method: propertyKey,
              duration: Date.now() - startTime,
              ...customFields,
            },
          },
        );

        return result;
      } catch (error) {
        // Başarısız işlemi log'la
        if (auditService) {
          await auditService.createAuditLog(
            'system',
            target.constructor.name.replace('Service', ''),
            'UPDATE',
            { error: (error as Error).message },
            { 
              correlationId: `error_${Date.now()}`,
              customFields: { method: propertyKey },
            },
          ).catch(() => {}); // Audit hatası orijinal hatayı gölgelemesin
        }
        throw error;
      }
    };

    return descriptor;
  };
}