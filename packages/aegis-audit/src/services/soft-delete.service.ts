// ============================================
// @aegis/audit - Soft Delete Service
// Soft delete, restore ve hard delete işlemleri
// Anayasaya Uygun Güçlendirilmiş
// ============================================

import { PrismaClient } from '@prisma/client';
import { logger, AppError } from '@aegis/core';
import { AuditTrailService } from './audit-trail.service';
import type {
  SoftDeleteResult,
  SoftDeletedRecord,
  SoftDeleteListOptions,
  SoftDeleteCheckResult,
  RestoreResult,
  HardDeleteResult,
} from '../types/soft-delete.types';

// ============================================
// SERVİS
// ============================================

export class SoftDeleteService {
  private readonly MAX_LIST_LIMIT = 100;
  private readonly DEFAULT_LIST_LIMIT = 20;

  private prisma: PrismaClient;
  private auditService: AuditTrailService;

  constructor(prisma: PrismaClient, auditService: AuditTrailService) {
    this.prisma = prisma;
    this.auditService = auditService;
  }

  // ============================================
  // 1. softDelete()
  // ============================================

  /**
   * Entity'yi soft delete yapar (kalıcı silme yerine deletedAt işaretler)
   * SoftDeleteRegistry'ye kayıt ekler ve audit log yazar
   * 
   * @param entityType - Entity tipi (User, Product, Order vb.)
   * @param entityId - Entity'nin unique ID'si
   * @param deletedBy - Silme işlemini yapan kullanıcı ID'si (opsiyonel)
   * @param reason - Silme nedeni (opsiyonel)
   * @returns SoftDeleteResult - Soft delete sonucu
   * 
   * @example
   * const result = await service.softDelete('User', 'user-123', 'admin-456', 'Hesap kapatma');
   * // { entityType: 'User', entityId: 'user-123', status: 'soft_deleted', deletedAt: Date, deletedBy: 'admin-456' }
   */
  async softDelete(
    entityType: string,
    entityId: string,
    deletedBy?: string,
    reason?: string,
  ): Promise<SoftDeleteResult> {
    // Input validasyonu
    this.validateEntityInfo(entityType, entityId);

    try {
      // Entity var mı kontrol et
      const existing = await (this.prisma as any)[entityType.toLowerCase()].findUnique({
        where: { id: entityId },
      });

      if (!existing) {
        return {
          entityType,
          entityId,
          status: 'not_found',
          deletedAt: null,
          deletedBy,
          deletionReason: reason,
        };
      }

      // Zaten silinmiş mi kontrol et
      if (existing.deletedAt) {
        return {
          entityType,
          entityId,
          status: 'soft_deleted',
          deletedAt: existing.deletedAt,
          deletedBy: existing.deletedBy || deletedBy,
          deletionReason: existing.deletionReason || reason,
        };
      }

      // Transaction: soft delete + registry kaydı
      await this.prisma.$transaction(async (tx) => {
        // 1. Entity'yi soft delete yap
        await (tx as any)[entityType.toLowerCase()].update({
          where: { id: entityId },
          data: { deletedAt: new Date() },
        });

        // 2. SoftDeleteRegistry'ye kaydet
        await tx.softDeleteRegistry.create({
          data: {
            entityType,
            entityId,
            originalData: JSON.stringify(existing),
            deletedBy: deletedBy || null,
            deletionReason: reason || null,
          },
        });
      });

      // Audit log yaz (transaction dışında)
      await this.auditService.createAuditLog(
        deletedBy || 'system',
        entityType,
        'DELETE',
        { deletedAt: new Date().toISOString() },
        {
          correlationId: `soft_delete_${entityType}_${entityId}`,
          customFields: {
            entityId,
            method: 'softDelete',
            deletionReason: reason,
          },
        },
      ).catch(() => {}); // Audit hatası soft delete'i engellemesin

      logger.info('Soft delete completed', { entityType, entityId, deletedBy });

      return {
        entityType,
        entityId,
        status: 'soft_deleted',
        deletedAt: new Date(),
        deletedBy,
        deletionReason: reason,
      };
    } catch (error) {
      logger.error('Soft delete failed', error as Error, { entityType, entityId });

      throw new AppError({
        code: 'INTERNAL_ERROR',
        message: `Soft delete failed for ${entityType} with id ${entityId}`,
        statusCode: 500,
      });
    }
  }

  // ============================================
  // 2. restore()
  // ============================================

  /**
   * Soft delete edilmiş entity'yi geri getirir
   * SoftDeleteRegistry'den kaydı siler ve audit log yazar
   * 
   * @param entityType - Entity tipi
   * @param entityId - Entity'nin unique ID'si
   * @returns RestoreResult - Geri getirme sonucu
   * 
   * @example
   * const result = await service.restore('User', 'user-123');
   * // { entityType: 'User', entityId: 'user-123', status: 'restored', restoredAt: Date }
   */
  async restore(entityType: string, entityId: string): Promise<RestoreResult> {
    // Input validasyonu
    this.validateEntityInfo(entityType, entityId);

    try {
      // Registry'de kayıt var mı kontrol et
      const registryRecord = await this.prisma.softDeleteRegistry.findUnique({
        where: {
          entityType_entityId: {
            entityType,
            entityId,
          },
        },
      });

      if (!registryRecord) {
        return {
          entityType,
          entityId,
          status: 'not_found',
          restoredAt: null,
        };
      }

      // Zaten kalıcı silinmiş mi kontrol et
      if (registryRecord.isHardDeleted) {
        return {
          entityType,
          entityId,
          status: 'not_found',
          restoredAt: null,
        };
      }

      // Transaction: restore + registry silme
      await this.prisma.$transaction(async (tx) => {
        // 1. Entity'yi geri getir
        await (tx as any)[entityType.toLowerCase()].update({
          where: { id: entityId },
          data: { deletedAt: null },
        });

        // 2. Registry'den sil
        await tx.softDeleteRegistry.delete({
          where: { id: registryRecord.id },
        });
      });

      // Audit log yaz (transaction dışında)
      await this.auditService.createAuditLog(
        'system',
        entityType,
        'UPDATE',
        { restored: true },
        {
          correlationId: `restore_${entityType}_${entityId}`,
          customFields: { entityId, method: 'restore' },
        },
      ).catch(() => {});

      logger.info('Restore completed', { entityType, entityId });

      return {
        entityType,
        entityId,
        status: 'restored',
        restoredAt: new Date(),
      };
    } catch (error) {
      logger.error('Restore failed', error as Error, { entityType, entityId });

      throw new AppError({
        code: 'INTERNAL_ERROR',
        message: `Restore failed for ${entityType} with id ${entityId}`,
        statusCode: 500,
      });
    }
  }

  // ============================================
  // 3. hardDelete()
  // ============================================

  /**
   * Soft delete edilmiş entity'yi KALICI olarak siler
   * Registry'de isHardDeleted işaretler ve audit log yazar
   * 
   * @param entityType - Entity tipi
   * @param entityId - Entity'nin unique ID'si
   * @returns HardDeleteResult - Kalıcı silme sonucu
   * 
   * @example
   * const result = await service.hardDelete('User', 'user-123');
   * // { entityType: 'User', entityId: 'user-123', status: 'hard_deleted', hardDeletedAt: Date }
   */
  async hardDelete(entityType: string, entityId: string): Promise<HardDeleteResult> {
    // Input validasyonu
    this.validateEntityInfo(entityType, entityId);

    try {
      // Registry'de kayıt var mı kontrol et
      const registryRecord = await this.prisma.softDeleteRegistry.findUnique({
        where: {
          entityType_entityId: {
            entityType,
            entityId,
          },
        },
      });

      if (!registryRecord) {
        return {
          entityType,
          entityId,
          status: 'not_soft_deleted',
          hardDeletedAt: null,
        };
      }

      // Zaten kalıcı silinmiş mi kontrol et
      if (registryRecord.isHardDeleted) {
        return {
          entityType,
          entityId,
          status: 'hard_deleted',
          hardDeletedAt: registryRecord.hardDeletedAt,
        };
      }

      // Transaction: hard delete + registry işaretleme
      await this.prisma.$transaction(async (tx) => {
        // 1. Entity'yi tamamen sil
        await (tx as any)[entityType.toLowerCase()].delete({
          where: { id: entityId },
        });

        // 2. Registry'de isHardDeleted işaretle
        await tx.softDeleteRegistry.update({
          where: { id: registryRecord.id },
          data: {
            isHardDeleted: true,
            hardDeletedAt: new Date(),
          },
        });
      });

      // Audit log yaz (transaction dışında)
      await this.auditService.createAuditLog(
        'system',
        entityType,
        'DELETE',
        { hardDeleted: true },
        {
          correlationId: `hard_delete_${entityType}_${entityId}`,
          customFields: { entityId, method: 'hardDelete' },
        },
      ).catch(() => {});

      logger.info('Hard delete completed', { entityType, entityId });

      return {
        entityType,
        entityId,
        status: 'hard_deleted',
        hardDeletedAt: new Date(),
      };
    } catch (error) {
      logger.error('Hard delete failed', error as Error, { entityType, entityId });

      throw new AppError({
        code: 'INTERNAL_ERROR',
        message: `Hard delete failed for ${entityType} with id ${entityId}`,
        statusCode: 500,
      });
    }
  }

  // ============================================
  // 4. getSoftDeletedRecords()
  // ============================================

  /**
   * Soft delete edilmiş kayıtları listeler
   * 
   * @param options - Listeleme seçenekleri (entityType, limit, offset, includeHardDeleted)
   * @returns SoftDeletedRecord[] - Silinen kayıtların listesi
   * 
   * @example
   * const deletedUsers = await service.getSoftDeletedRecords({
   *   entityType: 'User',
   *   limit: 50,
   *   includeHardDeleted: false,
   * });
   */
  async getSoftDeletedRecords(
  options: SoftDeleteListOptions = {},
): Promise<SoftDeletedRecord[]> {
  const {
    entityType,
    limit = this.DEFAULT_LIST_LIMIT,
    offset = 0,
    includeHardDeleted = false,
  } = options;

  const safeLimit = Math.min(this.MAX_LIST_LIMIT, Math.max(1, limit));
  const safeOffset = Math.max(0, offset);

  const where: Record<string, any> = {};
  if (entityType) where.entityType = entityType;
  
  // ✅ DÜZELTME: includeHardDeleted false ise sadece soft deleted'ları getir
  if (!includeHardDeleted) {
    where.isHardDeleted = false;
  }
  // includeHardDeleted true ise where.isHardDeleted EKLEME → tüm kayıtlar gelir

  const records = await this.prisma.softDeleteRegistry.findMany({
    where,
    take: safeLimit,
    skip: safeOffset,
    orderBy: { createdAt: 'desc' },
  });

  return records.map((record) => ({
    id: record.id,
    entityType: record.entityType,
    entityId: record.entityId,
    originalData: this.safeJSONParse(record.originalData),
    deletedBy: record.deletedBy,
    deletionReason: record.deletionReason,
    isHardDeleted: record.isHardDeleted,
    hardDeletedAt: record.hardDeletedAt,
    createdAt: record.createdAt,
  }));
}
  // ============================================
  // 5. isSoftDeleted()
  // ============================================

  /**
   * Entity'nin soft delete edilip edilmediğini kontrol eder
   * 
   * @param entityType - Entity tipi
   * @param entityId - Entity'nin unique ID'si
   * @returns SoftDeleteCheckResult - Soft delete kontrol sonucu
   * 
   * @example
   * const check = await service.isSoftDeleted('User', 'user-123');
   * // { isSoftDeleted: true, isHardDeleted: false, deletedAt: Date, deletedBy: 'admin-456' }
   */
  async isSoftDeleted(
    entityType: string,
    entityId: string,
  ): Promise<SoftDeleteCheckResult> {
    // Input validasyonu
    this.validateEntityInfo(entityType, entityId);

    const record = await this.prisma.softDeleteRegistry.findUnique({
      where: {
        entityType_entityId: {
          entityType,
          entityId,
        },
      },
    });

    if (!record) {
      return {
        isSoftDeleted: false,
        isHardDeleted: false,
        deletedAt: null,
        deletedBy: null,
      };
    }

    return {
      isSoftDeleted: true,
      isHardDeleted: record.isHardDeleted,
      deletedAt: record.createdAt,
      deletedBy: record.deletedBy,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * entityType ve entityId validasyonu
   */
  private validateEntityInfo(entityType: string, entityId: string): void {
    if (!entityType || typeof entityType !== 'string' || entityType.trim().length === 0) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'entityType is required and must be a non-empty string',
        statusCode: 400,
      });
    }
    if (!entityId || typeof entityId !== 'string' || entityId.trim().length === 0) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'entityId is required and must be a non-empty string',
        statusCode: 400,
      });
    }
  }

  /**
   * Güvenli JSON parse (hata durumunda fallback döner)
   */
  private safeJSONParse(str: string | null, fallback: any = {}): any {
    if (!str) return fallback;
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }
}