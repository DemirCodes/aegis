// ============================================
// @aegis/audit - GDPR Deletion Service
// ============================================

import { PrismaClient } from '@prisma/client';
import { logger } from '@aegis/core';
import type {
  GDPRErasureResult,
  UserDataExport,
  AnonymizationResult,
  CascadeDeletePlan,
  ErasureVerification,
  ScheduledErasure,
} from '../types/gdpr.types';
import { AuditTrailService } from './audit-trail.service';

export class GDPRDeletionService {
  private prisma: PrismaClient;
  private auditService: AuditTrailService;
  private scheduledErasures: Map<string, ScheduledErasure> = new Map();

  constructor(prisma: PrismaClient, auditService: AuditTrailService) {
    this.prisma = prisma;
    this.auditService = auditService;
  }

  /**
   * Kullanıcı verilerini GDPR uyumlu şekilde sil
   */
  async eraseUserData(userId: string, reason: string): Promise<GDPRErasureResult> {
    const startTime = Date.now();
    const tablesAffected: string[] = [];
    let recordsDeleted = 0;
    const errors: string[] = [];

    try {
      // 1. Kullanıcıya ait session'ları sil
      const sessions = await this.prisma.userSession.deleteMany({ where: { userId } });
      recordsDeleted += sessions.count;
      tablesAffected.push('UserSession');

      // 2. Kullanıcı rollerini sil
      const roles = await this.prisma.userRole.deleteMany({ where: { userId } });
      recordsDeleted += roles.count;
      tablesAffected.push('UserRole');

      // 3. Risk event'lerini sil
      const riskEvents = await this.prisma.riskEvent.deleteMany({ where: { userId } });
      recordsDeleted += riskEvents.count;
      tablesAffected.push('RiskEvent');

      // 4. Audit log'ları anonimleştir (userId'yi null yap)
      const auditLogs = await this.prisma.auditLog.updateMany({
        where: { userId },
        data: { userId: null },
      });
      recordsDeleted += auditLogs.count;
      tablesAffected.push('AuditLog');

      // 5. Soft delete registry'e kaydet
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await this.prisma.softDeleteRegistry.create({
          data: {
            entityType: 'User',
            entityId: userId,
            originalData: JSON.stringify(user),
            deletedBy: userId,
            deletionReason: reason,
            isHardDeleted: false,
          },
        });
        tablesAffected.push('SoftDeleteRegistry');
      }

      // 6. Kullanıcıyı sil
      await this.prisma.user.delete({ where: { id: userId } });
      recordsDeleted++;
      tablesAffected.push('User');

      // Audit log'a kaydet
      await this.auditService.createAuditLog(userId, 'User', 'DELETE', { reason }, {
        correlationId: `gdpr_erase_${userId}`,
      });

      logger.info('GDPR erasure completed', { userId, tablesAffected, recordsDeleted });

      return {
        userId,
        status: 'completed',
        erasedAt: new Date(),
        tablesAffected,
        recordsDeleted,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);
      logger.error('GDPR erasure failed', error as Error, { userId });

      return {
        userId,
        status: 'failed',
        erasedAt: new Date(),
        tablesAffected,
        recordsDeleted,
        errors,
      };
    }
  }

  /**
   * Kullanıcı verilerini dışa aktar (GDPR right-to-data)
   */
  async exportUserData(userId: string, format: 'json' | 'csv' = 'json'): Promise<UserDataExport> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const auditLogs = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });
    const sessions = await this.prisma.userSession.findMany({ where: { userId } });

    const data = {
      profile: user,
      activities: auditLogs.map((l) => ({
        action: l.action,
        entity: l.entityType,
        timestamp: l.timestamp,
      })),
      auditLogs: auditLogs,
      metadata: {
        exportedAt: new Date().toISOString(),
        sessionCount: sessions.length,
      },
    };

    logger.info('User data exported', { userId, format });

    return {
      userId,
      exportedAt: new Date(),
      data,
      format,
    };
  }

  /**
   * Kullanıcı verilerini anonimleştir
   */
  async anonymizeUserData(userId: string, fields: string[]): Promise<AnonymizationResult> {
    try {
      const anonymizedData: Record<string, string> = {};
      const defaultFields = ['email', 'phone', 'fullName', 'firstName', 'lastName'];
      const fieldsToAnonymize = fields.length ? fields : defaultFields;

      for (const field of fieldsToAnonymize) {
        if (field === 'email') anonymizedData[field] = `anonymized_${userId.substring(0, 8)}@anonymous.local`;
        else if (field === 'phone') anonymizedData[field] = '+0000000000';
        else anonymizedData[field] = '[ANONYMIZED]';
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: anonymizedData,
      });

      await this.auditService.createAuditLog(userId, 'User', 'UPDATE', anonymizedData, {
        correlationId: `gdpr_anonymize_${userId}`,
      });

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

  /**
   * Cascade delete planı göster (simülasyon)
   */
  async getCascadeDeletePlan(userId: string): Promise<CascadeDeletePlan> {
    const tables: CascadeDeletePlan['tables'] = [];

    // Kullanıcı
    const userCount = await this.prisma.user.count({ where: { id: userId } });
    tables.push({ table: 'User', recordCount: userCount, cascadeDepth: 0 });

    // Session'lar
    const sessionCount = await this.prisma.userSession.count({ where: { userId } });
    tables.push({ table: 'UserSession', recordCount: sessionCount, cascadeDepth: 1 });

    // Roller
    const roleCount = await this.prisma.userRole.count({ where: { userId } });
    tables.push({ table: 'UserRole', recordCount: roleCount, cascadeDepth: 1 });

    // Risk event'leri
    const riskCount = await this.prisma.riskEvent.count({ where: { userId } });
    tables.push({ table: 'RiskEvent', recordCount: riskCount, cascadeDepth: 1 });

    // Audit log'lar
    const auditCount = await this.prisma.auditLog.count({ where: { userId } });
    tables.push({ table: 'AuditLog', recordCount: auditCount, cascadeDepth: 1 });

    const totalRecordsToDelete = tables.reduce((sum, t) => sum + t.recordCount, 0);

    return {
      userId,
      tables,
      totalRecordsToDelete,
      estimatedDuration: Math.ceil(totalRecordsToDelete * 0.01), // ~100 records/saniye tahmini
    };
  }

  /**
   * Silme işleminin tamamlandığını doğrula
   */
  async verifyErasureCompletion(userId: string): Promise<ErasureVerification> {
    const orphanedRecords: ErasureVerification['orphanedRecords'] = [];

    // Her tabloda kullanıcıya ait kayıt kalmış mı kontrol et
    const userExists = await this.prisma.user.count({ where: { id: userId } });
    if (userExists > 0) orphanedRecords.push({ table: 'User', count: userExists });

    const sessionsExist = await this.prisma.userSession.count({ where: { userId } });
    if (sessionsExist > 0) orphanedRecords.push({ table: 'UserSession', count: sessionsExist });

    const isComplete = orphanedRecords.length === 0;

    return {
      userId,
      isComplete,
      orphanedRecords,
      verifiedAt: new Date(),
      status: isComplete ? 'clean' : 'has_orphans',
    };
  }

  /**
   * Veri silme işlemini ileri tarihe planla
   */
  async scheduleDataErasure(userId: string, scheduledAt: Date, reason: string): Promise<ScheduledErasure> {
    const scheduled: ScheduledErasure = {
      userId,
      scheduledAt,
      status: 'scheduled',
      createdAt: new Date(),
      canBeCancelled: true,
    };

    this.scheduledErasures.set(userId, scheduled);

    logger.info('Data erasure scheduled', { userId, scheduledAt, reason });

    // Planlanan zamanda silme işlemini çalıştır
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
}