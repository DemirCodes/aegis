// ============================================
// @aegis/audit - Audit Report Service
// ============================================

import { PrismaClient } from '../../../../prisma/generated/client';
import { logger, toJSON } from '@aegis/core';

interface SummaryReport {
  period: { startDate: Date; endDate: Date };
  totalActions: number;
  actionBreakdown: Record<string, number>;
  entityBreakdown: Record<string, number>;
  userBreakdown: Record<string, number>;
  dailyActivity: Record<string, number>;
  generatedAt: Date;
}

interface ActiveUser {
  userId: string;
  totalActions: number;
}

interface ChangedEntity {
  entityType: string;
  totalChanges: number;
}

interface FailedAuditLogEntry {
  id: string;
  userId: string | null;
  entityType: string;
  action: string;
  errorMessage: string | null;
  timestamp: Date;
}

interface HourlyActivity {
  date: string;
  hourlyActivity: Record<number, number>;
}

export class AuditReportService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async generateSummaryReport(startDate: Date, endDate: Date): Promise<SummaryReport> {
    logger.info('Generating summary report', { startDate, endDate });

    const logs = await this.prisma.auditLog.findMany({
      where: { timestamp: { gte: startDate, lte: endDate } },
      select: { action: true, entityType: true, userId: true, timestamp: true },
    });

    const totalActions = logs.length;
    const actionBreakdown: Record<string, number> = {};
    const entityBreakdown: Record<string, number> = {};
    const userBreakdown: Record<string, number> = {};
    const dailyActivity: Record<string, number> = {};

    for (const log of logs) {
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
      entityBreakdown[log.entityType] = (entityBreakdown[log.entityType] || 0) + 1;
      userBreakdown[log.userId || 'unknown'] = (userBreakdown[log.userId || 'unknown'] || 0) + 1;
      const day = log.timestamp.toISOString().split('T')[0];
      dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    }

    return {
      period: { startDate, endDate },
      totalActions,
      actionBreakdown,
      entityBreakdown,
      userBreakdown,
      dailyActivity,
      generatedAt: new Date(),
    };
  }

  async getMostActiveUsers(limit: number = 10): Promise<ActiveUser[]> {
    const result = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    return result.map((item: { userId: string | null; _count: { id: number } }) => ({
      userId: item.userId || 'unknown',
      totalActions: item._count.id,
    }));
  }

  async getMostChangedEntities(limit: number = 10): Promise<ChangedEntity[]> {
    const result = await this.prisma.auditLog.groupBy({
      by: ['entityType'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    return result.map((item: { entityType: string; _count: { id: number } }) => ({
      entityType: item.entityType,
      totalChanges: item._count.id,
    }));
  }

  async getFailedAuditLogs(limit: number = 100): Promise<FailedAuditLogEntry[]> {
    logger.warn('Fetching failed audit logs', { limit });

    const logs = await this.prisma.auditLog.findMany({
      where: { status: 'failed' },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: { id: true, userId: true, entityType: true, action: true, errorMessage: true, timestamp: true },
    });

    return logs.map((log: FailedAuditLogEntry) => ({
      id: log.id,
      userId: log.userId,
      entityType: log.entityType,
      action: log.action,
      errorMessage: log.errorMessage,
      timestamp: log.timestamp,
    }));
  }

  async getHourlyActivity(date: Date = new Date()): Promise<HourlyActivity> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await this.prisma.auditLog.findMany({
      where: { timestamp: { gte: startOfDay, lte: endOfDay } },
      select: { timestamp: true },
    });

    const hourlyData: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourlyData[h] = 0;
    for (const log of logs) {
      hourlyData[log.timestamp.getHours()] = (hourlyData[log.timestamp.getHours()] || 0) + 1;
    }

    return { date: startOfDay.toISOString().split('T')[0], hourlyActivity: hourlyData };
  }

  async exportReport(startDate: Date, endDate: Date): Promise<string> {
    const report = await this.generateSummaryReport(startDate, endDate);
    return toJSON(report, { pretty: true });
  }
}