"use strict";
// ============================================
// @aegis/audit - GDPR Deletion Service (Enhanced)
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.GDPRDeletionService = void 0;
const core_1 = require("@aegis/core");
class GDPRDeletionService {
    prisma;
    auditService;
    scheduledErasures = new Map();
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    /**
     * Kullanıcı verilerini GDPR uyumlu şekilde sil (TRANSACTION destekli)
     */
    async eraseUserData(userId, reason) {
        if (!userId)
            throw new core_1.AppError('VALIDATION_ERROR', 'userId is required', 400);
        if (!reason)
            throw new core_1.AppError('VALIDATION_ERROR', 'reason is required', 400);
        const tablesAffected = [];
        let recordsDeleted = 0;
        try {
            await this.prisma.$transaction(async (tx) => {
                // 1. Session'ları sil
                const sessions = await tx.userSession.deleteMany({ where: { userId } });
                recordsDeleted += sessions.count;
                tablesAffected.push('UserSession');
                // 2. Rolleri sil
                const roles = await tx.userRole.deleteMany({ where: { userId } });
                recordsDeleted += roles.count;
                tablesAffected.push('UserRole');
                // 3. Risk event'lerini sil
                const riskEvents = await tx.riskEvent.deleteMany({ where: { userId } });
                recordsDeleted += riskEvents.count;
                tablesAffected.push('RiskEvent');
                // 4. Audit log'ları anonimleştir
                const auditLogs = await tx.auditLog.updateMany({
                    where: { userId },
                    data: { userId: null },
                });
                recordsDeleted += auditLogs.count;
                tablesAffected.push('AuditLog');
                // 5. Soft delete registry
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
            }).catch(() => { }); // Audit hatası silmeyi engellemesin
            core_1.logger.info('GDPR erasure completed', { userId, tablesAffected, recordsDeleted });
            return {
                userId,
                status: 'completed',
                erasedAt: new Date(),
                tablesAffected,
                recordsDeleted,
            };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            core_1.logger.error('GDPR erasure failed', error, { userId });
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
    /**
     * Kullanıcı verilerini dışa aktar (GDPR right-to-data)
     */
    async exportUserData(userId, format = 'json') {
        if (!userId)
            throw new core_1.AppError('VALIDATION_ERROR', 'userId is required', 400);
        const [user, auditLogs, sessions] = await Promise.all([
            this.prisma.user.findUnique({ where: { id: userId } }),
            this.prisma.auditLog.findMany({ where: { userId }, orderBy: { timestamp: 'desc' }, take: 1000 }),
            this.prisma.userSession.findMany({ where: { userId } }),
        ]);
        if (!user)
            throw new core_1.AppError('NOT_FOUND', 'User not found', 404);
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
        core_1.logger.info('User data exported', { userId, format });
        return { userId, exportedAt: new Date(), data, format };
    }
    /**
     * Kullanıcı verilerini anonimleştir
     */
    async anonymizeUserData(userId, fields = []) {
        if (!userId)
            throw new core_1.AppError('VALIDATION_ERROR', 'userId is required', 400);
        try {
            const defaultFields = ['email', 'phone', 'firstName', 'lastName'];
            const fieldsToAnonymize = fields.length ? fields : defaultFields;
            const anonymizedData = {};
            for (const field of fieldsToAnonymize) {
                if (field === 'email')
                    anonymizedData[field] = `anon_${userId.substring(0, 8)}@deleted.local`;
                else if (field === 'phone')
                    anonymizedData[field] = '+0000000000';
                else
                    anonymizedData[field] = '[REDACTED]';
            }
            await this.prisma.user.update({
                where: { id: userId },
                data: anonymizedData,
            });
            await this.auditService.createAuditLog(userId, 'User', 'UPDATE', { anonymized: fieldsToAnonymize }, {
                correlationId: `gdpr_anonymize_${userId}`,
            }).catch(() => { });
            core_1.logger.info('User data anonymized', { userId, fields: fieldsToAnonymize });
            return {
                userId,
                anonymizedAt: new Date(),
                fieldsAnonymized: fieldsToAnonymize,
                status: 'completed',
            };
        }
        catch (error) {
            core_1.logger.error('Anonymization failed', error, { userId });
            return { userId, anonymizedAt: new Date(), fieldsAnonymized: fields, status: 'failed' };
        }
    }
    /**
     * Cascade delete planı göster (simülasyon)
     */
    async getCascadeDeletePlan(userId) {
        if (!userId)
            throw new core_1.AppError('VALIDATION_ERROR', 'userId is required', 400);
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
        ];
        const totalRecordsToDelete = tables.reduce((sum, t) => sum + t.recordCount, 0);
        return { userId, tables, totalRecordsToDelete, estimatedDuration: Math.ceil(totalRecordsToDelete * 0.01) };
    }
    /**
     * Silme işleminin tamamlandığını doğrula
     */
    async verifyErasureCompletion(userId) {
        if (!userId)
            throw new core_1.AppError('VALIDATION_ERROR', 'userId is required', 400);
        const [userExists, sessionsExist] = await Promise.all([
            this.prisma.user.count({ where: { id: userId } }),
            this.prisma.userSession.count({ where: { userId } }),
        ]);
        const orphanedRecords = [];
        if (userExists > 0)
            orphanedRecords.push({ table: 'User', count: userExists });
        if (sessionsExist > 0)
            orphanedRecords.push({ table: 'UserSession', count: sessionsExist });
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
    async scheduleDataErasure(userId, scheduledAt, reason) {
        if (!userId)
            throw new core_1.AppError('VALIDATION_ERROR', 'userId is required', 400);
        if (scheduledAt <= new Date())
            throw new core_1.AppError('VALIDATION_ERROR', 'scheduledAt must be in the future', 400);
        const scheduled = {
            userId,
            scheduledAt,
            status: 'scheduled',
            createdAt: new Date(),
            canBeCancelled: true,
        };
        this.scheduledErasures.set(userId, scheduled);
        core_1.logger.info('Data erasure scheduled', { userId, scheduledAt, reason });
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
    /**
     * Planlanmış silme işlemini iptal et
     */
    cancelScheduledErasure(userId) {
        const scheduled = this.scheduledErasures.get(userId);
        if (scheduled && scheduled.canBeCancelled) {
            scheduled.status = 'cancelled';
            scheduled.canBeCancelled = false;
            this.scheduledErasures.set(userId, scheduled);
            core_1.logger.info('Scheduled erasure cancelled', { userId });
            return true;
        }
        return false;
    }
}
exports.GDPRDeletionService = GDPRDeletionService;
//# sourceMappingURL=gdpr-deletion.service.js.map