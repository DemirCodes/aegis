// ============================================
// @aegis/audit - Audit Trail Service (Enhanced)
// ============================================

import { PrismaClient } from '@prisma/client';
import { logger, AppError } from '@aegis/core';

import type {
  AuditLog,
  AuditFilters,
  PaginatedAuditLogs,
  UserActivityLog,
  ActivityHistoryOptions,
  ExportFormat,
  AuditMetadata,
  AuditAction,
} from '../types/audit.types';
import { generateAuditId, generateChangesSummary, maskSensitiveData } from '../utils/audit-helpers';

export class AuditTrailService {
  private readonly MAX_PAGE_SIZE = 100;
  private readonly DEFAULT_PAGE_SIZE = 20;
  
  private prisma: PrismaClient;
  private sensitiveFields: string[];

  constructor(prisma: PrismaClient, sensitiveFields: string[] = []) {
    this.prisma = prisma;
    this.sensitiveFields = [...sensitiveFields, 'password', 'creditCard', 'ssn', 'secret', 'token'];
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Yeni audit log oluştur
   */
  async createAuditLog(
    userId: string,
    entityType: string,
    action: AuditAction,
    changes: Record<string, any>,
    metadata?: AuditMetadata,
  ): Promise<AuditLog> {
    // Input validasyonu
    if (!userId) throw new AppError('VALIDATION_ERROR', 'userId is required', 400);
    if (!entityType) throw new AppError('VALIDATION_ERROR', 'entityType is required', 400);
    if (!action) throw new AppError('VALIDATION_ERROR', 'action is required', 400);

    const id = generateAuditId();
    const changesSummary = generateChangesSummary(changes);
    const maskedChanges = maskSensitiveData(changes, this.sensitiveFields);

    try {
      const log = await this.prisma.auditLog.create({
        data: {
          id,
          userId,
          entityType,
          entityId: metadata?.customFields?.entityId || 'unknown',
          action,
          changes: JSON.stringify(maskedChanges),
          changesSummary,
          ipAddress: metadata?.ipAddress || undefined,
          userAgent: metadata?.userAgent || undefined,
          correlationId: metadata?.correlationId || undefined,
          metadata: metadata?.customFields ? JSON.stringify(metadata.customFields) : null,
          status: 'completed',
        },
      });

      logger.info('Audit log created', { auditId: id, userId, entityType, action });

      return this.mapToAuditLog(log);
    } catch (error) {
      logger.error('Failed to create audit log', error as Error, { userId, entityType, action });
      throw new AppError('AUDIT_LOG_FAILED', 'Failed to create audit log', 500);
    }
  }

  /**
   * Audit log'ları sorgula (filtrele, sayfala)
   */
  async getAuditLogs(
    filters: AuditFilters = {},
    pagination: { page?: number; pageSize?: number; sort?: string[] } = {},
  ): Promise<PaginatedAuditLogs> {
    const { userId, entityType, action, startDate, endDate, entityId } = filters;
    
    // Sayfalama sınırları
    const page = Math.max(1, pagination.page || 1);
    const pageSize = Math.min(this.MAX_PAGE_SIZE, Math.max(1, pagination.pageSize || this.DEFAULT_PAGE_SIZE));
    const skip = (page - 1) * pageSize;

    // Filtreleme
    const where: Record<string, any> = {};
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (entityId) where.entityId = entityId;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    // Paralel sorgu (performans)
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { timestamp: 'desc' },
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

  /**
   * ID ile audit log getir
   */
  async getAuditLogById(auditLogId: string): Promise<AuditLog | null> {
    if (!auditLogId) throw new AppError('VALIDATION_ERROR', 'auditLogId is required', 400);

    const log = await this.prisma.auditLog.findUnique({
      where: { id: auditLogId },
    });

    return log ? this.mapToAuditLog(log) : null;
  }

  /**
   * Audit trail'ı dışa aktar
   */
  async exportAuditTrail(filters: AuditFilters, format: ExportFormat): Promise<Buffer> {
    const validFormats: ExportFormat[] = ['json', 'csv', 'pdf'];
    if (!validFormats.includes(format)) {
      throw new AppError('VALIDATION_ERROR', `Unsupported format: ${format}. Use: ${validFormats.join(', ')}`, 400);
    }

    const { data } = await this.getAuditLogs(filters, { pageSize: this.MAX_PAGE_SIZE });

    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(data, null, 2));
      case 'csv':
        return this.convertToCSV(data);
      case 'pdf':
        return this.convertToPDF(data);
    }
  }

  /**
   * Kullanıcının aktivite geçmişini getir
   */
  async getUserActivityHistory(userId: string, options: ActivityHistoryOptions = {}): Promise<UserActivityLog[]> {
    if (!userId) throw new AppError('VALIDATION_ERROR', 'userId is required', 400);

    const { limit = 100, includeFailures = true, entityFilters } = options;
    const safeLimit = Math.min(1000, Math.max(1, limit));

    const where: Record<string, any> = { userId };
    if (!includeFailures) where.status = 'completed';
    if (entityFilters?.length) where.entityType = { in: entityFilters };

    const logs = await this.prisma.auditLog.findMany({
      where,
      take: safeLimit,
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true, action: true, entityType: true, entityId: true, changes: true, ipAddress: true },
    });

    return logs.map((log) => ({
      timestamp: log.timestamp,
      action: log.action,
      entity: log.entityType,
      entityId: log.entityId,
      changes: JSON.parse(log.changes || '{}'),
      ipAddress: log.ipAddress || undefined,
    }));
  }

  /**
   * Entity'nin değişiklik geçmişini getir
   */
  async getEntityHistory(entityType: string, entityId: string): Promise<AuditLog[]> {
    if (!entityType || !entityId) throw new AppError('VALIDATION_ERROR', 'entityType and entityId are required', 400);

    const logs = await this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { timestamp: 'desc' },
      take: 500,
    });

    return logs.map((log) => this.mapToAuditLog(log));
  }

  /**
   * Audit log'larda arama
   */
  async searchAuditLogs(query: string, filters: AuditFilters = {}): Promise<AuditLog[]> {
    if (!query || query.trim().length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Search query is required', 400);
    }

    const safeQuery = query.trim().substring(0, 200); // Max 200 karakter

    const logs = await this.prisma.auditLog.findMany({
      where: {
        ...filters,
        OR: [
          { changesSummary: { contains: safeQuery } },
          { entityType: { contains: safeQuery } },
          { action: { contains: safeQuery } },
        ],
      },
      take: 100,
      orderBy: { timestamp: 'desc' },
    });

    return logs.map((log) => this.mapToAuditLog(log));
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapToAuditLog(log: any): AuditLog {
    return {
      id: log.id,
      userId: log.userId || 'unknown',
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action as AuditAction,
      changes: this.safeJSONParse(log.changes, {}),
      metadata: {
        ipAddress: log.ipAddress || undefined,
        userAgent: log.userAgent || undefined,
        correlationId: log.correlationId || undefined,
        customFields: log.metadata ? this.safeJSONParse(log.metadata) : undefined,
      },
      timestamp: log.timestamp,
      status: log.status as 'completed' | 'failed',
    };
  }

  private safeJSONParse(str: string | null, fallback: any = {}): any {
    if (!str) return fallback;
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }

  private convertToCSV(data: AuditLog[]): Buffer {
    const header = 'id,userId,entityType,entityId,action,changesSummary,timestamp,status\n';
    const rows = data.map((log) =>
      `${this.escapeCSV(log.id)},${this.escapeCSV(log.userId)},${this.escapeCSV(log.entityType)},${this.escapeCSV(log.entityId)},${log.action},"${generateChangesSummary(log.changes)}",${log.timestamp.toISOString()},${log.status}`,
    ).join('\n');
    return Buffer.from(header + rows);
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private convertToPDF(data: AuditLog[]): Buffer {
    const content = JSON.stringify(data, null, 2);
    return Buffer.from(`AUDIT TRAIL REPORT\n${'='.repeat(50)}\nGenerated: ${new Date().toISOString()}\n\n${content}`);
  }
}