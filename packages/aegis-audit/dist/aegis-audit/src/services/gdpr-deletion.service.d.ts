import { PrismaClient } from '@prisma/client';
import type { GDPRErasureResult, UserDataExport, AnonymizationResult, CascadeDeletePlan, ErasureVerification, ScheduledErasure } from '../types/gdpr.types';
import { AuditTrailService } from './audit-trail.service';
export declare class GDPRDeletionService {
    private prisma;
    private auditService;
    private scheduledErasures;
    constructor(prisma: PrismaClient, auditService: AuditTrailService);
    /**
     * Kullanıcı verilerini GDPR uyumlu şekilde sil (TRANSACTION destekli)
     */
    eraseUserData(userId: string, reason: string): Promise<GDPRErasureResult>;
    /**
     * Kullanıcı verilerini dışa aktar (GDPR right-to-data)
     */
    exportUserData(userId: string, format?: 'json' | 'csv'): Promise<UserDataExport>;
    /**
     * Kullanıcı verilerini anonimleştir
     */
    anonymizeUserData(userId: string, fields?: string[]): Promise<AnonymizationResult>;
    /**
     * Cascade delete planı göster (simülasyon)
     */
    getCascadeDeletePlan(userId: string): Promise<CascadeDeletePlan>;
    /**
     * Silme işleminin tamamlandığını doğrula
     */
    verifyErasureCompletion(userId: string): Promise<ErasureVerification>;
    /**
     * Veri silme işlemini ileri tarihe planla
     */
    scheduleDataErasure(userId: string, scheduledAt: Date, reason: string): Promise<ScheduledErasure>;
    /**
     * Planlanmış silme işlemini iptal et
     */
    cancelScheduledErasure(userId: string): boolean;
}
//# sourceMappingURL=gdpr-deletion.service.d.ts.map