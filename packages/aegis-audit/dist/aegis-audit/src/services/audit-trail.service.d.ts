import { PrismaClient } from '@prisma/client';
import type { AuditLog, AuditFilters, PaginatedAuditLogs, UserActivityLog, ActivityHistoryOptions, ExportFormat, AuditMetadata, AuditAction } from '../types/audit.types';
type PaginationInput = {
    page?: number;
    pageSize?: number;
    sort?: string[];
};
export declare class AuditTrailService {
    private readonly MAX_PAGE_SIZE;
    private readonly DEFAULT_PAGE_SIZE;
    private readonly MAX_ACTIVITY_LIMIT;
    private prisma;
    private sensitiveFields;
    constructor(prisma: PrismaClient, sensitiveFields?: string[]);
    /**
     * Yeni audit log oluştur
     * Başarısız olursa status: 'failed' olarak kaydetmeyi dener
     */
    createAuditLog(userId: string, entityType: string, action: AuditAction, changes: Record<string, any>, metadata?: AuditMetadata): Promise<AuditLog>;
    /**
     * Audit log'ları sorgula (filtrele, sırala, sayfala)
     */
    getAuditLogs(filters?: AuditFilters, pagination?: PaginationInput): Promise<PaginatedAuditLogs>;
    /**
     * ID ile audit log getir
     */
    getAuditLogById(auditLogId: string): Promise<AuditLog | null>;
    /**
     * Audit trail'ı dışa aktar (JSON, CSV, PDF)
     * PDF: gerçek PDF formatında (pdfkit ile)
     */
    exportAuditTrail(filters: AuditFilters, format: ExportFormat): Promise<Buffer>;
    /**
     * Kullanıcının aktivite geçmişini getir
     * Anayasa: limit default 100
     */
    getUserActivityHistory(userId: string, options?: ActivityHistoryOptions): Promise<UserActivityLog[]>;
    /**
     * Entity'nin değişiklik geçmişini getir
     * Validasyonu güçlendirildi
     */
    getEntityHistory(entityType: string, entityId: string): Promise<AuditLog[]>;
    /**
     * Audit log'larda arama
     * Performans iyileştirmesi: changesSummary üzerinde odaklı arama
     */
    searchAuditLogs(query: string, filters?: AuditFilters): Promise<AuditLog[]>;
    /**
     * Prisma auditLog kaydını tip güvenli AuditLog'a dönüştür
     */
    private mapToAuditLog;
    /**
     * Sort parametresini Prisma orderBy formatına dönüştürür
     * Anayasa formatı: ['createdAt:desc', 'entityType:asc']
     */
    private buildOrderBy;
    /**
     * Güvenli JSON parse (hata durumunda fallback döner)
     */
    private safeJSONParse;
    /**
     * Audit log'ları CSV formatına dönüştürür
     */
    private convertToCSV;
    /**
     * CSV alanını escape et (virgül, tırnak, newline)
     */
    private escapeCSV;
    /**
     * Audit log'ları GERÇEK PDF formatına dönüştürür (pdfkit ile)
     * Anayasa: exportAuditTrail PDF formatı → Buffer dönmeli
     */
    private convertToPDF;
}
export {};
//# sourceMappingURL=audit-trail.service.d.ts.map