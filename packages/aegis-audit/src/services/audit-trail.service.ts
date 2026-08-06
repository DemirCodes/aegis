// ============================================
// @aegis/audit - Audit Trail Service
// ============================================

import { PrismaClient } from '@prisma/client';
import { logger } from '@aegis/core';
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
  private prisma: PrismaClient;
  private sensitiveFields: string[];

  constructor(prisma: PrismaClient, sensitiveFields: string[] = []) {
    this.prisma = prisma;
    this.sensitiveFields = [...sensitiveFields, 'password', 'creditCard', 'ssn', 'secret'];
  }

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
    const id = generateAuditId();
    const changesSummary = generateChangesSummary(changes);
    const maskedChanges = maskSensitiveData(changes, this.sensitiveFields);

    const log = await this.prisma.auditLog.create({
      data: {
        id,
        userId,
        entityType,
        entityId: metadata?.customFields?.entityId || 'unknown',
        action,
        changes: JSON.stringify(maskedChanges),
        changesSummary,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        correlationId: metadata?.correlationId,
        metadata: metadata?.customFields ? JSON.stringify(metadata.customFields) : null,
        status: 'completed',
      },
    });

    logger.info('Audit log created', {
      auditId: id,
      userId,
      entityType,
      action,
      changesSummary,
    });

    return this.mapToAuditLog(log);
  }

  /**
   * Audit log'ları sorgula (filtrele, sayfala)
   */
  async getAuditLogs(filters: AuditFilters = {}, pagination: { page?: number; pageSize?: number; sort?: string[] } = {}): Promise<PaginatedAuditLogs> {
    const { userId, entityType, action, startDate, endDate, entityId } = filters;
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (entityId) where.entityId = entityId;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

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
    const log = await this.prisma.auditLog.findUnique({
      where: { id: auditLogId },
    });

    return log ? this.mapToAuditLog(log) : null;
  }

  /**
   * Audit trail'ı dışa aktar
   */
  async exportAuditTrail(filters: AuditFilters, format: ExportFormat): Promise<Buffer> {
    const { data } = await this.getAuditLogs(filters, { pageSize: 10000 });

    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(data, null, 2));
      case 'csv':
        return this.convertToCSV(data);
      case 'pdf':
        return this.convertToPDF(data);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Kullanıcının aktivite geçmişini getir
   */
  async getUserActivityHistory(userId: string, options: ActivityHistoryOptions = {}): Promise<UserActivityLog[]> {
    const { limit = 100, includeFailures = true, entityFilters } = options;

    const where: any = { userId };

    if (!includeFailures) {
      where.status = 'completed';
    }

    if (entityFilters?.length) {
      where.entityType = { in: entityFilters };
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      take: limit,
      orderBy: { timestamp: 'desc' },
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
    const logs = await this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { timestamp: 'desc' },
    });

    return logs.map((log) => this.mapToAuditLog(log));
  }

  /**
   * Audit log'larda full-text arama (şimdilik basit LIKE)
   */
  async searchAuditLogs(query: string, filters: AuditFilters = {}): Promise<AuditLog[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        ...filters,
        changesSummary: { contains: query },
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
      changes: JSON.parse(log.changes || '{}'),
      metadata: {
        ipAddress: log.ipAddress || undefined,
        userAgent: log.userAgent || undefined,
        correlationId: log.correlationId || undefined,
        customFields: log.metadata ? JSON.parse(log.metadata) : undefined,
      },
      timestamp: log.timestamp,
      status: log.status as 'completed' | 'failed',
    };
  }

  private convertToCSV(data: AuditLog[]): Buffer {
    const header = 'id,userId,entityType,entityId,action,changesSummary,timestamp,status\n';
    const rows = data.map((log) =>
      `${log.id},${log.userId},${log.entityType},${log.entityId},${log.action},"${generateChangesSummary(log.changes)}",${log.timestamp},${log.status}`
    ).join('\n');
    return Buffer.from(header + rows);
  }

  private convertToPDF(data: AuditLog[]): Buffer {
    // Basit PDF placeholder - gerçek implementasyon için pdfkit vb. kullanılabilir
    const content = JSON.stringify(data, null, 2);
    return Buffer.from(`AUDIT TRAIL REPORT\n${'='.repeat(50)}\n${content}`);
  }
}