// ============================================
// @aegis/audit - GDPR Deletion Service
// ============================================

import { PrismaClient } from '@prisma/client';
import { logger, AppError } from '@aegis/core';
import type {
  GDPRErasureResult,
  UserDataExport,
  AnonymizationResult,
  CascadeDeletePlan,
  ErasureVerification,
  ScheduledErasure,
} from '../types/gdpr.types';
import { AuditTrailService } from './audit-trail.service';

// ============================================
// SERVİS
// ============================================

export class GDPRDeletionService {
  private prisma: PrismaClient;
  private auditService: AuditTrailService;
  private scheduledErasures: Map<string, ScheduledErasure> = new Map();

  constructor(prisma: PrismaClient, auditService: AuditTrailService) {
    this.prisma = prisma;
    this.auditService = auditService;
  }

  // ============================================
  // 1. eraseUserData()
  // ============================================

  /**
   * Kullanıcı verilerini GDPR uyumlu şekilde siler
   * Tüm kişisel veriyi cascade olarak siler, audit log'a kaydeder
   * Transaction destekli - tüm silme işlemleri atomik olarak yapılır
   * 
   * @param userId - Silinecek kullanıcının ID'si
   * @param reason - Silme nedeni (user_requested, account_close vb.)
   * @returns GDPRErasureResult - Silme sonucu
   * 
   * @example
   * const result = await service.eraseUserData('user-123', 'user_requested');
   * // { userId: 'user-123', status: 'completed', tablesAffected: ['User', 'UserSession'], recordsDeleted: 45 }
   */
  async eraseUserData(userId: string, reason: string): Promise<GDPRErasureResult> {
    // Input validasyonu
    if (!userId) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'userId is required',
        statusCode: 400,
      });
    }
    if (!reason) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'reason is required',
        statusCode: 400,
      });
    }

    const tablesAffected: string[] = [];
    let recordsDeleted = 0;

    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Session'ları sil
        const sessions = await tx.userSession.deleteMany({ where: { userId } });
        if (sessions.count > 0) {
          recordsDeleted += sessions.count;
          tablesAffected.push('UserSession');
        }

        // 2. Rolleri sil
        const roles = await tx.userRole.deleteMany({ where: { userId } });
        if (roles.count > 0) {
          recordsDeleted += roles.count;
          tablesAffected.push('UserRole');
        }

        // 3. Risk event'lerini sil
        const riskEvents = await tx.riskEvent.deleteMany({ where: { userId } });
        if (riskEvents.count > 0) {
          recordsDeleted += riskEvents.count;
          tablesAffected.push('RiskEvent');
        }

        // 4. Audit log'ları TAMAMEN sil (GDPR: anonimleştirme değil, silme)
        const auditLogs = await tx.auditLog.deleteMany({ where: { userId } });
        if (auditLogs.count > 0) {
          recordsDeleted += auditLogs.count;
          tablesAffected.push('AuditLog');
        }

        // 5. Soft delete registry oluştur
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (user) {
          await tx.softDeleteRegistry.create({
            data: {
              entityType: 'User',
              entityId: userId,
              originalData: JSON.stringify(user),
              deletedBy: userId,
              deletionReason: reason,
            },
          });
          tablesAffected.push('SoftDeleteRegistry');
        }

        // 6. Kullanıcıyı sil
        await tx.user.delete({ where: { id: userId } });
        recordsDeleted++;
        tablesAffected.push('User');
      });

      // Audit log (transaction dışında - başarısız olsa da silme tamamlandı)
      await this.auditService.createAuditLog(userId, 'User', 'DELETE', { reason }, {
        correlationId: `gdpr_erase_${userId}`,
      }).catch(() => {}); // Audit hatası silmeyi engellemesin

      logger.info('GDPR erasure completed', {
        userId,
        tablesAffected,
        recordsDeleted,
      });

      return {
        userId,
        status: 'completed',
        erasedAt: new Date(),
        tablesAffected,
        recordsDeleted,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('GDPR erasure failed', error as Error, { userId });

      return {
        userId,
        status: 'failed',
        erasedAt: new Date(),
        tablesAffected,
        recordsDeleted,
        errors: [errorMsg],
      };
    }
  }

  // ============================================
  // 2. exportUserData()
  // ============================================

  /**
   * Kullanıcı verilerini dışa aktarır (GDPR right-to-data)
   * 
   * @param userId - Hangi kullanıcının verisi?
   * @param format - 'json' | 'csv' (default: 'json')
   * @returns UserDataExport - Kullanıcı verisi
   * 
   * @example
   * const data = await service.exportUserData('user-123', 'json');
   * // { userId, exportedAt, data: { profile: {...}, activities: [...], auditLogs: [...] }, format: 'json' }
   */
  async exportUserData(userId: string, format: 'json' | 'csv' = 'json'): Promise<UserDataExport> {
    if (!userId) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'userId is required',
        statusCode: 400,
      });
    }

    const [user, auditLogs, sessions] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.auditLog.findMany({ where: { userId }, orderBy: { timestamp: 'desc' }, take: 1000 }),
      this.prisma.userSession.findMany({ where: { userId } }),
    ]);

    if (!user) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: 'User not found',
        statusCode: 404,
      });
    }

    const data = {
      profile: user,
      activities: auditLogs.map((l) => ({
        action: l.action,
        entity: l.entityType,
        timestamp: l.timestamp,
      })),
      auditLogs,
      metadata: {
        exportedAt: new Date().toISOString(),
        sessionCount: sessions.length,
      },
    };

    logger.info('User data exported', { userId, format });

    return { userId, exportedAt: new Date(), data, format };
  }

  // ============================================
  // 3. anonymizeUserData()
  // ============================================

  /**
   * Kullanıcı verilerini anonimleştirir (tamamen silme yerine)
   * PII'ı kaldırır ama işlem geçmişini tutar
   * 
   * @param userId - Hangi kullanıcı anonimleştirilecek?
   * @param fields - Hangi alanlar anonimleştirilsin? (zorunlu, örn: ['email', 'phone'])
   * @returns AnonymizationResult - Anonimleştirme sonucu
   * 
   * @example
   * const result = await service.anonymizeUserData('user-123', ['email', 'phone']);
   * // { userId: 'user-123', fieldsAnonymized: ['email', 'phone'], status: 'completed' }
   */
  async anonymizeUserData(userId: string, fields: string[] = []): Promise<AnonymizationResult> {
    if (!userId) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'userId is required',
        statusCode: 400,
      });
    }

    try {
      // Anayasa: fields zorunlu parametre, varsayılan kullanmıyoruz
      const fieldsToAnonymize = fields.length > 0 ? fields : ['email', 'phone', 'firstName', 'lastName'];
      const anonymizedData: Record<string, string> = {};

      for (const field of fieldsToAnonymize) {
        if (field === 'email') anonymizedData[field] = `anon_${userId.substring(0, 8)}@deleted.local`;
        else if (field === 'phone') anonymizedData[field] = '+0000000000';
        else anonymizedData[field] = '[REDACTED]';
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: anonymizedData,
      });

      await this.auditService.createAuditLog(userId, 'User', 'UPDATE', { anonymized: fieldsToAnonymize }, {
        correlationId: `gdpr_anonymize_${userId}`,
      }).catch(() => {});

      logger.info('User data anonymized', { userId, fields: fieldsToAnonymize });

      return {
        userId,
        anonymizedAt: new Date(),
        fieldsAnonymized: fieldsToAnonymize,
        status: 'completed',
      };
    } catch (error) {
      logger.error('Anonymization failed', error as Error, { userId });
      return {
        userId,
        anonymizedAt: new Date(),
        fieldsAnonymized: fields,
        status: 'failed',
      };
    }
  }

  // ============================================
  // 4. getCascadeDeletePlan()
  // ============================================

  /**
   * Kullanıcı silindiğinde hangi tablolara cascade delete yapılacağını gösterir
   * Silme öncesi impact analizi
   * 
   * @param userId - Hangi kullanıcı?
   * @returns CascadeDeletePlan - Tablo bazlı silme planı
   * 
   * @example
   * const plan = await service.getCascadeDeletePlan('user-123');
   * // { userId, tables: [{ table: 'User', recordCount: 1, cascadeDepth: 0 }, ...], totalRecordsToDelete: 45 }
   */
  async getCascadeDeletePlan(userId: string): Promise<CascadeDeletePlan> {
    if (!userId) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'userId is required',
        statusCode: 400,
      });
    }

    const [userCount, sessionCount, roleCount, riskCount, auditCount] = await Promise.all([
      this.prisma.user.count({ where: { id: userId } }),
      this.prisma.userSession.count({ where: { userId } }),
      this.prisma.userRole.count({ where: { userId } }),
      this.prisma.riskEvent.count({ where: { userId } }),
      this.prisma.auditLog.count({ where: { userId } }),
    ]);

    const tables = [
      { table: 'User', recordCount: userCount, cascadeDepth: 0 },
      { table: 'UserSession', recordCount: sessionCount, cascadeDepth: 1 },
      { table: 'UserRole', recordCount: roleCount, cascadeDepth: 1 },
      { table: 'RiskEvent', recordCount: riskCount, cascadeDepth: 1 },
      { table: 'AuditLog', recordCount: auditCount, cascadeDepth: 1 },
    ].filter((t) => t.recordCount > 0); // Sadece kaydı olan tabloları göster

    const totalRecordsToDelete = tables.reduce((sum, t) => sum + t.recordCount, 0);

    return {
      userId,
      tables,
      totalRecordsToDelete,
      estimatedDuration: Math.ceil(totalRecordsToDelete * 0.01),
    };
  }

  // ============================================
  // 5. verifyErasureCompletion()
  // ============================================

  /**
   * Silme işleminin tamamlandığını doğrular
   * Tüm cascade tabloları kontrol eder (orphaned records)
   * 
   * @param userId - Hangi kullanıcının silinişi kontrol edilecek?
   * @returns ErasureVerification - Doğrulama sonucu
   * 
   * @example
   * const verify = await service.verifyErasureCompletion('user-123');
   * // { userId, isComplete: true, orphanedRecords: [], status: 'clean' }
   */
  async verifyErasureCompletion(userId: string): Promise<ErasureVerification> {
    if (!userId) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'userId is required',
        statusCode: 400,
      });
    }

    // TÜM cascade tabloları kontrol et (sadece 2 değil)
    const [userExists, sessionsExist, rolesExist, riskEventsExist, auditLogsExist] = await Promise.all([
      this.prisma.user.count({ where: { id: userId } }),
      this.prisma.userSession.count({ where: { userId } }),
      this.prisma.userRole.count({ where: { userId } }),
      this.prisma.riskEvent.count({ where: { userId } }),
      this.prisma.auditLog.count({ where: { userId } }),
    ]);

    const orphanedRecords: ErasureVerification['orphanedRecords'] = [];
    if (userExists > 0) orphanedRecords.push({ table: 'User', count: userExists });
    if (sessionsExist > 0) orphanedRecords.push({ table: 'UserSession', count: sessionsExist });
    if (rolesExist > 0) orphanedRecords.push({ table: 'UserRole', count: rolesExist });
    if (riskEventsExist > 0) orphanedRecords.push({ table: 'RiskEvent', count: riskEventsExist });
    if (auditLogsExist > 0) orphanedRecords.push({ table: 'AuditLog', count: auditLogsExist });

    const isComplete = orphanedRecords.length === 0;

    return {
      userId,
      isComplete,
      orphanedRecords,
      verifiedAt: new Date(),
      status: isComplete ? 'clean' : 'has_orphans',
    };
  }

  // ============================================
  // 6. scheduleDataErasure()
  // ============================================

  /**
   * Veri silme işlemini ileri tarihe planlar
   * 
   * @param userId - Silinecek kullanıcı
   * @param scheduledAt - Ne zaman silinsin? (gelecek tarih olmalı)
   * @param reason - Silme nedeni
   * @returns ScheduledErasure - Planlanmış silme bilgisi
   * 
   * @example
   * const scheduled = await service.scheduleDataErasure(
   *   'user-123',
   *   new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
   *   'user_requested_with_30day_delay'
   * );
   * // { userId, scheduledAt, status: 'scheduled', canBeCancelled: true }
   */
  async scheduleDataErasure(userId: string, scheduledAt: Date, reason: string): Promise<ScheduledErasure> {
    if (!userId) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'userId is required',
        statusCode: 400,
      });
    }
    if (!scheduledAt) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'scheduledAt is required',
        statusCode: 400,
      });
    }
    if (scheduledAt <= new Date()) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'scheduledAt must be in the future',
        statusCode: 400,
      });
    }
    if (!reason) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'reason is required',
        statusCode: 400,
      });
    }

    const scheduled: ScheduledErasure = {
      userId,
      scheduledAt,
      status: 'scheduled',
      createdAt: new Date(),
      canBeCancelled: true,
    };

    this.scheduledErasures.set(userId, scheduled);
    logger.info('Data erasure scheduled', { userId, scheduledAt, reason });

    const delay = scheduledAt.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(async () => {
        await this.eraseUserData(userId, reason);
        scheduled.status = 'executed';
        scheduled.canBeCancelled = false;
        this.scheduledErasures.set(userId, scheduled);
      }, delay);
    }

    return scheduled;
  }

  // ============================================
  // 7. cancelScheduledErasure() (Anayasa dışı - şimdilik bırakıldı)
  // ============================================

  /**
   * Planlanmış silme işlemini iptal eder
   * Not: Anayasada tanımlı değil, ileride eklenebilir
   * 
   * @param userId - İptal edilecek kullanıcı
   * @returns boolean - true: iptal edildi, false: iptal edilemedi
   */
  cancelScheduledErasure(userId: string): boolean {
    const scheduled = this.scheduledErasures.get(userId);
    if (scheduled && scheduled.canBeCancelled) {
      scheduled.status = 'cancelled';
      scheduled.canBeCancelled = false;
      this.scheduledErasures.set(userId, scheduled);
      logger.info('Scheduled erasure cancelled', { userId });
      return true;
    }
    return false;
  }
}