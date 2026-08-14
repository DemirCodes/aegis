// ============================================
// @aegis/audit - Audit Trail Service
// TIER 1 Anayasasına Uygun Güçlendirilmiş
// ============================================

import { PrismaClient } from '@prisma/client';
import { logger, AppError } from '@aegis/core';
import PDFDocument from 'pdfkit';

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
import {
  generateAuditId,
  generateChangesSummary,
  maskSensitiveData,
} from '../utils/audit-helpers';

// ============================================
// TİP TANIMLARI
// ============================================

type PaginationInput = {
  page?: number;
  pageSize?: number;
  sort?: string[];
};

// ============================================
// SERVİS
// ============================================

export class AuditTrailService {
  private readonly MAX_PAGE_SIZE = 100;
  private readonly DEFAULT_PAGE_SIZE = 20;
  private readonly MAX_ACTIVITY_LIMIT = 100; // Anayasa: limit default 100

  private prisma: PrismaClient;
  private sensitiveFields: string[];

  constructor(prisma: PrismaClient, sensitiveFields: string[] = []) {
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
  async createAuditLog(
    userId: string,
    entityType: string,
    action: AuditAction,
    changes: Record<string, any>,
    metadata?: AuditMetadata,
  ): Promise<AuditLog> {
    // Input validasyonu
    if (!userId) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'userId is required',
        statusCode: 400,
      });
    }
    if (!entityType) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'entityType is required',
        statusCode: 400,
      });
    }
    if (!action) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'action is required',
        statusCode: 400,
      });
    }

    const id = generateAuditId();
    const changesSummary = generateChangesSummary(changes);
    const maskedChanges = maskSensitiveData(changes, this.sensitiveFields);
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

      logger.info('Audit log created', {
        auditId: id,
        userId,
        entityType,
        action,
      });

      return this.mapToAuditLog(log);
    } catch (error) {
      // Hata durumunda log kaybolmasın: failed olarak kaydetmeyi dene
      logger.error('Failed to create audit log, attempting failed record', error as Error, {
        userId,
        entityType,
        action,
      });

      try {
        const failedLog = await this.prisma.auditLog.create({
          data: {
            id: generateAuditId(), // Yeni ID (unique constraint çakışmasın)
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
            errorMessage: (error as Error).message,
          },
        });

        logger.warn('Audit log saved as failed', { auditId: failedLog.id });
        return this.mapToAuditLog(failedLog);
      } catch (secondError) {
        // İkinci deneme de başarısız olursa artık yapılacak bir şey yok
        logger.error('CRITICAL: Could not save audit log (both attempts failed)', secondError as Error, {
          userId,
          entityType,
          action,
        });
        throw new AppError({
          code: 'AUDIT_LOG_FAILED',
          message: 'Failed to create audit log',
          statusCode: 500,
        });
      }
    }
  }

  // ============================================
  // 2. getAuditLogs()
  // ============================================

  /**
   * Audit log'ları sorgula (filtrele, sırala, sayfala)
   */
  async getAuditLogs(
    filters: AuditFilters = {},
    pagination: PaginationInput = {},
  ): Promise<PaginatedAuditLogs> {
    const { userId, entityType, action, startDate, endDate, entityId } = filters;

    // Sayfalama sınırları
    const page = Math.max(1, pagination.page || 1);
    const pageSize = Math.min(
      this.MAX_PAGE_SIZE,
      Math.max(1, pagination.pageSize || this.DEFAULT_PAGE_SIZE),
    );
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
  async getAuditLogById(auditLogId: string): Promise<AuditLog | null> {
    if (!auditLogId) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'auditLogId is required',
        statusCode: 400,
      });
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
  async exportAuditTrail(
    filters: AuditFilters,
    format: ExportFormat,
  ): Promise<Buffer> {
    const validFormats: ExportFormat[] = ['json', 'csv', 'pdf'];
    if (!validFormats.includes(format)) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: `Unsupported format: ${format}. Use: ${validFormats.join(', ')}`,
        statusCode: 400,
      });
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
  async getUserActivityHistory(
    userId: string,
    options: ActivityHistoryOptions = {},
  ): Promise<UserActivityLog[]> {
    if (!userId) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'userId is required',
        statusCode: 400,
      });
    }

    const { limit = this.MAX_ACTIVITY_LIMIT, includeFailures = true, entityFilters } = options;
    const safeLimit = Math.min(this.MAX_ACTIVITY_LIMIT, Math.max(1, limit));

    const where: Record<string, any> = { userId };
    if (!includeFailures) where.status = 'completed';
    if (entityFilters?.length) where.entityType = { in: entityFilters };

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
  async getEntityHistory(
    entityType: string,
    entityId: string,
  ): Promise<AuditLog[]> {
    // Güçlendirilmiş validasyon
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
  async searchAuditLogs(
    query: string,
    filters: AuditFilters = {},
  ): Promise<AuditLog[]> {
    if (!query || query.trim().length === 0) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Search query is required',
        statusCode: 400,
      });
    }

    const safeQuery = query.trim().substring(0, 200); // Max 200 karakter
    const { userId, entityType, action, startDate, endDate, entityId } = filters;

    // Filtreleme
    const where: Record<string, any> = {};

    // Önce spesifik filtreler
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (entityId) where.entityId = entityId;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
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
  private mapToAuditLog(log: any): AuditLog {
    return {
      id: log.id,
      userId: log.userId || 'unknown',
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action as AuditAction,
      changes: this.safeJSONParse(log.changes, {}),
      changesSummary: log.changesSummary || undefined,
      metadata: {
        ipAddress: log.ipAddress || undefined,
        userAgent: log.userAgent || undefined,
        correlationId: log.correlationId || undefined,
        customFields: log.metadata ? this.safeJSONParse(log.metadata) : undefined,
      },
      timestamp: log.timestamp,
      status: log.status as 'completed' | 'failed',
      errorMessage: log.errorMessage || undefined,
    };
  }

  /**
   * Sort parametresini Prisma orderBy formatına dönüştürür
   * Anayasa formatı: ['createdAt:desc', 'entityType:asc']
   */
  private buildOrderBy(sort?: string[]): any {
    if (!sort || sort.length === 0) {
      return { timestamp: 'desc' }; // Varsayılan sıralama
    }

    const orderBy: any[] = [];

    for (const item of sort) {
      const [field, direction] = item.split(':');
      if (!field) continue;

      // Güvenli alan adı kontrolü (whitelist)
      const allowedFields = ['timestamp', 'createdAt', 'entityType', 'action', 'userId'];
      if (!allowedFields.includes(field)) continue;

      orderBy.push({
        [field]: direction === 'asc' ? 'asc' : 'desc',
      });
    }

    return orderBy.length > 0 ? orderBy : { timestamp: 'desc' };
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

  /**
   * Audit log'ları CSV formatına dönüştürür
   */
  private convertToCSV(data: AuditLog[]): Buffer {
    const header = 'id,userId,entityType,entityId,action,changesSummary,timestamp,status\n';
    const rows = data
      .map((log) =>
        `${this.escapeCSV(log.id)},${this.escapeCSV(log.userId)},${this.escapeCSV(log.entityType)},${this.escapeCSV(log.entityId)},${log.action},"${generateChangesSummary(log.changes)}",${log.timestamp.toISOString()},${log.status}`,
      )
      .join('\n');

    return Buffer.from(header + rows);
  }

  /**
   * CSV alanını escape et (virgül, tırnak, newline)
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Audit log'ları GERÇEK PDF formatına dönüştürür (pdfkit ile)
   * Anayasa: exportAuditTrail PDF formatı → Buffer dönmeli
   */
  private async convertToPDF(data: AuditLog[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        // Buffer'ı topla
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
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
          if (index > 0) doc.moveDown(1);

          doc.fontSize(12).text(`#${index + 1} - ${log.action} | ${log.entityType} | ${log.timestamp.toISOString()}`, { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10).text(`ID: ${log.id}`);
          doc.fontSize(10).text(`User: ${log.userId}`);
          doc.fontSize(10).text(`Entity: ${log.entityType} (${log.entityId})`);
          doc.fontSize(10).text(`Status: ${log.status}`);
          doc.fontSize(10).text(`Changes Summary: ${log.changesSummary || generateChangesSummary(log.changes)}`);
          doc.moveDown(0.5);
          doc.fontSize(9).text('Changes:', { underline: true });
          doc.fontSize(8).text(JSON.stringify(log.changes, null, 2));
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}