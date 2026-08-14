"use strict";
// ============================================
// @aegis/audit - Audit Trail Service
// TIER 1 Anayasasına Uygun Güçlendirilmiş
// ============================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditTrailService = void 0;
const core_1 = require("@aegis/core");
const pdfkit_1 = __importDefault(require("pdfkit"));
const audit_helpers_1 = require("../utils/audit-helpers");
// ============================================
// SERVİS
// ============================================
class AuditTrailService {
    MAX_PAGE_SIZE = 100;
    DEFAULT_PAGE_SIZE = 20;
    MAX_ACTIVITY_LIMIT = 100; // Anayasa: limit default 100
    prisma;
    sensitiveFields;
    constructor(prisma, sensitiveFields = []) {
        this.prisma = prisma;
        this.sensitiveFields = [
            ...sensitiveFields,
            'password',
            'creditCard',
            'ssn',
            'secret',
            'token',
        ];
    }
    // ============================================
    // 1. createAuditLog()
    // ============================================
    /**
     * Yeni audit log oluştur
     * Başarısız olursa status: 'failed' olarak kaydetmeyi dener
     */
    async createAuditLog(userId, entityType, action, changes, metadata) {
        // Input validasyonu
        if (!userId)
            throw new core_1.AppError('VALIDATION_ERROR', 'userId is required', 400);
        if (!entityType)
            throw new core_1.AppError('VALIDATION_ERROR', 'entityType is required', 400);
        if (!action)
            throw new core_1.AppError('VALIDATION_ERROR', 'action is required', 400);
        const id = (0, audit_helpers_1.generateAuditId)();
        const changesSummary = (0, audit_helpers_1.generateChangesSummary)(changes);
        const maskedChanges = (0, audit_helpers_1.maskSensitiveData)(changes, this.sensitiveFields);
        const entityId = metadata?.customFields?.entityId || 'unknown';
        try {
            // Ana kayıt denemesi
            const log = await this.prisma.auditLog.create({
                data: {
                    id,
                    userId,
                    entityType,
                    entityId,
                    action,
                    changes: JSON.stringify(maskedChanges),
                    changesSummary,
                    ipAddress: metadata?.ipAddress || undefined,
                    userAgent: metadata?.userAgent || undefined,
                    correlationId: metadata?.correlationId || undefined,
                    metadata: metadata?.customFields
                        ? JSON.stringify(metadata.customFields)
                        : null,
                    status: 'completed',
                },
            });
            core_1.logger.info('Audit log created', {
                auditId: id,
                userId,
                entityType,
                action,
            });
            return this.mapToAuditLog(log);
        }
        catch (error) {
            // Hata durumunda log kaybolmasın: failed olarak kaydetmeyi dene
            core_1.logger.error('Failed to create audit log, attempting failed record', error, {
                userId,
                entityType,
                action,
            });
            try {
                const failedLog = await this.prisma.auditLog.create({
                    data: {
                        id: (0, audit_helpers_1.generateAuditId)(), // Yeni ID (unique constraint çakışmasın)
                        userId,
                        entityType,
                        entityId,
                        action,
                        changes: JSON.stringify(maskedChanges),
                        changesSummary,
                        ipAddress: metadata?.ipAddress || undefined,
                        userAgent: metadata?.userAgent || undefined,
                        correlationId: metadata?.correlationId || undefined,
                        metadata: metadata?.customFields
                            ? JSON.stringify(metadata.customFields)
                            : null,
                        status: 'failed',
                        errorMessage: error.message,
                    },
                });
                core_1.logger.warn('Audit log saved as failed', { auditId: failedLog.id });
                return this.mapToAuditLog(failedLog);
            }
            catch (secondError) {
                // İkinci deneme de başarısız olursa artık yapılacak bir şey yok
                core_1.logger.error('CRITICAL: Could not save audit log (both attempts failed)', secondError, {
                    userId,
                    entityType,
                    action,
                });
                throw new core_1.AppError('AUDIT_LOG_FAILED', 'Failed to create audit log', 500);
            }
        }
    }
    // ============================================
    // 2. getAuditLogs()
    // ============================================
    /**
     * Audit log'ları sorgula (filtrele, sırala, sayfala)
     */
    async getAuditLogs(filters = {}, pagination = {}) {
        const { userId, entityType, action, startDate, endDate, entityId } = filters;
        // Sayfalama sınırları
        const page = Math.max(1, pagination.page || 1);
        const pageSize = Math.min(this.MAX_PAGE_SIZE, Math.max(1, pagination.pageSize || this.DEFAULT_PAGE_SIZE));
        const skip = (page - 1) * pageSize;
        // Filtreleme
        const where = {};
        if (userId)
            where.userId = userId;
        if (entityType)
            where.entityType = entityType;
        if (action)
            where.action = action;
        if (entityId)
            where.entityId = entityId;
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate)
                where.timestamp.gte = startDate;
            if (endDate)
                where.timestamp.lte = endDate;
        }
        // Sıralama (sort parametresini orderBy'a bağla)
        const orderBy = this.buildOrderBy(pagination.sort);
        // Paralel sorgu (performans)
        const [data, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip,
                take: pageSize,
                orderBy,
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return {
            data: data.map((log) => this.mapToAuditLog(log)),
            total,
            page,
            pageSize,
            hasMore: skip + pageSize < total,
        };
    }
    // ============================================
    // 3. getAuditLogById()
    // ============================================
    /**
     * ID ile audit log getir
     */
    async getAuditLogById(auditLogId) {
        if (!auditLogId) {
            throw new core_1.AppError('VALIDATION_ERROR', 'auditLogId is required', 400);
        }
        const log = await this.prisma.auditLog.findUnique({
            where: { id: auditLogId },
        });
        return log ? this.mapToAuditLog(log) : null;
    }
    // ============================================
    // 4. exportAuditTrail()
    // ============================================
    /**
     * Audit trail'ı dışa aktar (JSON, CSV, PDF)
     * PDF: gerçek PDF formatında (pdfkit ile)
     */
    async exportAuditTrail(filters, format) {
        const validFormats = ['json', 'csv', 'pdf'];
        if (!validFormats.includes(format)) {
            throw new core_1.AppError('VALIDATION_ERROR', `Unsupported format: ${format}. Use: ${validFormats.join(', ')}`, 400);
        }
        const { data } = await this.getAuditLogs(filters, {
            pageSize: this.MAX_PAGE_SIZE,
        });
        switch (format) {
            case 'json':
                return Buffer.from(JSON.stringify(data, null, 2));
            case 'csv':
                return this.convertToCSV(data);
            case 'pdf':
                return await this.convertToPDF(data);
        }
    }
    // ============================================
    // 5. getUserActivityHistory()
    // ============================================
    /**
     * Kullanıcının aktivite geçmişini getir
     * Anayasa: limit default 100
     */
    async getUserActivityHistory(userId, options = {}) {
        if (!userId) {
            throw new core_1.AppError('VALIDATION_ERROR', 'userId is required', 400);
        }
        const { limit = this.MAX_ACTIVITY_LIMIT, includeFailures = true, entityFilters } = options;
        const safeLimit = Math.min(this.MAX_ACTIVITY_LIMIT, Math.max(1, limit));
        const where = { userId };
        if (!includeFailures)
            where.status = 'completed';
        if (entityFilters?.length)
            where.entityType = { in: entityFilters };
        const logs = await this.prisma.auditLog.findMany({
            where,
            take: safeLimit,
            orderBy: { timestamp: 'desc' },
            select: {
                timestamp: true,
                action: true,
                entityType: true,
                entityId: true,
                changes: true,
                ipAddress: true,
            },
        });
        return logs.map((log) => ({
            timestamp: log.timestamp,
            action: log.action,
            entity: log.entityType,
            entityId: log.entityId,
            changes: this.safeJSONParse(log.changes, {}),
            ipAddress: log.ipAddress || undefined,
        }));
    }
    // ============================================
    // 6. getEntityHistory()
    // ============================================
    /**
     * Entity'nin değişiklik geçmişini getir
     * Validasyonu güçlendirildi
     */
    async getEntityHistory(entityType, entityId) {
        // Güçlendirilmiş validasyon
        if (!entityType || typeof entityType !== 'string' || entityType.trim().length === 0) {
            throw new core_1.AppError('VALIDATION_ERROR', 'entityType is required and must be a non-empty string', 400);
        }
        if (!entityId || typeof entityId !== 'string' || entityId.trim().length === 0) {
            throw new core_1.AppError('VALIDATION_ERROR', 'entityId is required and must be a non-empty string', 400);
        }
        const logs = await this.prisma.auditLog.findMany({
            where: {
                entityType: entityType.trim(),
                entityId: entityId.trim(),
            },
            orderBy: { timestamp: 'desc' },
            take: 500,
        });
        return logs.map((log) => this.mapToAuditLog(log));
    }
    // ============================================
    // 7. searchAuditLogs()
    // ============================================
    /**
     * Audit log'larda arama
     * Performans iyileştirmesi: changesSummary üzerinde odaklı arama
     */
    async searchAuditLogs(query, filters = {}) {
        if (!query || query.trim().length === 0) {
            throw new core_1.AppError('VALIDATION_ERROR', 'Search query is required', 400);
        }
        const safeQuery = query.trim().substring(0, 200); // Max 200 karakter
        const { userId, entityType, action, startDate, endDate, entityId } = filters;
        // Filtreleme
        const where = {};
        // Önce spesifik filtreler
        if (userId)
            where.userId = userId;
        if (entityType)
            where.entityType = entityType;
        if (action)
            where.action = action;
        if (entityId)
            where.entityId = entityId;
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate)
                where.timestamp.gte = startDate;
            if (endDate)
                where.timestamp.lte = endDate;
        }
        // Arama koşulları (OR)
        where.OR = [
            { changesSummary: { contains: safeQuery } },
            { entityType: { contains: safeQuery } },
            { action: { contains: safeQuery } },
        ];
        const logs = await this.prisma.auditLog.findMany({
            where,
            take: 100,
            orderBy: { timestamp: 'desc' },
        });
        return logs.map((log) => this.mapToAuditLog(log));
    }
    // ============================================
    // PRIVATE HELPERS
    // ============================================
    /**
     * Prisma auditLog kaydını tip güvenli AuditLog'a dönüştür
     */
    mapToAuditLog(log) {
        return {
            id: log.id,
            userId: log.userId || 'unknown',
            entityType: log.entityType,
            entityId: log.entityId,
            action: log.action,
            changes: this.safeJSONParse(log.changes, {}),
            changesSummary: log.changesSummary || undefined,
            metadata: {
                ipAddress: log.ipAddress || undefined,
                userAgent: log.userAgent || undefined,
                correlationId: log.correlationId || undefined,
                customFields: log.metadata ? this.safeJSONParse(log.metadata) : undefined,
            },
            timestamp: log.timestamp,
            status: log.status,
            errorMessage: log.errorMessage || undefined,
        };
    }
    /**
     * Sort parametresini Prisma orderBy formatına dönüştürür
     * Anayasa formatı: ['createdAt:desc', 'entityType:asc']
     */
    buildOrderBy(sort) {
        if (!sort || sort.length === 0) {
            return { timestamp: 'desc' }; // Varsayılan sıralama
        }
        const orderBy = [];
        for (const item of sort) {
            const [field, direction] = item.split(':');
            if (!field)
                continue;
            // Güvenli alan adı kontrolü (whitelist)
            const allowedFields = ['timestamp', 'createdAt', 'entityType', 'action', 'userId'];
            if (!allowedFields.includes(field))
                continue;
            orderBy.push({
                [field]: direction === 'asc' ? 'asc' : 'desc',
            });
        }
        return orderBy.length > 0 ? orderBy : { timestamp: 'desc' };
    }
    /**
     * Güvenli JSON parse (hata durumunda fallback döner)
     */
    safeJSONParse(str, fallback = {}) {
        if (!str)
            return fallback;
        try {
            return JSON.parse(str);
        }
        catch {
            return fallback;
        }
    }
    /**
     * Audit log'ları CSV formatına dönüştürür
     */
    convertToCSV(data) {
        const header = 'id,userId,entityType,entityId,action,changesSummary,timestamp,status\n';
        const rows = data
            .map((log) => `${this.escapeCSV(log.id)},${this.escapeCSV(log.userId)},${this.escapeCSV(log.entityType)},${this.escapeCSV(log.entityId)},${log.action},"${(0, audit_helpers_1.generateChangesSummary)(log.changes)}",${log.timestamp.toISOString()},${log.status}`)
            .join('\n');
        return Buffer.from(header + rows);
    }
    /**
     * CSV alanını escape et (virgül, tırnak, newline)
     */
    escapeCSV(value) {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }
    /**
     * Audit log'ları GERÇEK PDF formatına dönüştürür (pdfkit ile)
     * Anayasa: exportAuditTrail PDF formatı → Buffer dönmeli
     */
    async convertToPDF(data) {
        return new Promise((resolve, reject) => {
            try {
                const chunks = [];
                const doc = new pdfkit_1.default({ size: 'A4', margin: 50 });
                // Buffer'ı topla
                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);
                // PDF içeriği
                doc.fontSize(20).text('AUDIT TRAIL REPORT', { align: 'center' });
                doc.moveDown();
                doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
                doc.moveDown();
                doc.fontSize(10).text(`Total Records: ${data.length}`, { align: 'center' });
                doc.moveDown(2);
                // Her audit log için detay
                data.forEach((log, index) => {
                    if (index > 0)
                        doc.moveDown(1);
                    doc.fontSize(12).text(`#${index + 1} - ${log.action} | ${log.entityType} | ${log.timestamp.toISOString()}`, { underline: true });
                    doc.moveDown(0.5);
                    doc.fontSize(10).text(`ID: ${log.id}`);
                    doc.fontSize(10).text(`User: ${log.userId}`);
                    doc.fontSize(10).text(`Entity: ${log.entityType} (${log.entityId})`);
                    doc.fontSize(10).text(`Status: ${log.status}`);
                    doc.fontSize(10).text(`Changes Summary: ${log.changesSummary || (0, audit_helpers_1.generateChangesSummary)(log.changes)}`);
                    doc.moveDown(0.5);
                    doc.fontSize(9).text('Changes:', { underline: true });
                    doc.fontSize(8).text(JSON.stringify(log.changes, null, 2));
                });
                doc.end();
            }
            catch (error) {
                reject(error);
            }
        });
    }
}
exports.AuditTrailService = AuditTrailService;
//# sourceMappingURL=audit-trail.service.js.map