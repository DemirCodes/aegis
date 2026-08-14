"use strict";
// ============================================
// @aegis/audit - Audit Report Service (Enhanced)
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditReportService = void 0;
const core_1 = require("@aegis/core");
class AuditReportService {
    MAX_LIMIT = 100;
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateSummaryReport(startDate, endDate) {
        if (!startDate || !endDate)
            throw new core_1.AppError('VALIDATION_ERROR', 'startDate and endDate are required', 400);
        if (startDate > endDate)
            throw new core_1.AppError('VALIDATION_ERROR', 'startDate cannot be after endDate', 400);
        core_1.logger.info('Generating summary report', { startDate, endDate });
        const logs = await this.prisma.auditLog.findMany({
            where: { timestamp: { gte: startDate, lte: endDate } },
            select: { action: true, entityType: true, userId: true, timestamp: true },
        });
        const totalActions = logs.length;
        const actionBreakdown = {};
        const entityBreakdown = {};
        const userBreakdown = {};
        const dailyActivity = {};
        for (const log of logs) {
            actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
            entityBreakdown[log.entityType] = (entityBreakdown[log.entityType] || 0) + 1;
            userBreakdown[log.userId || 'unknown'] = (userBreakdown[log.userId || 'unknown'] || 0) + 1;
            const day = log.timestamp.toISOString().split('T')[0];
            dailyActivity[day] = (dailyActivity[day] || 0) + 1;
        }
        const report = {
            period: { startDate, endDate },
            totalActions,
            actionBreakdown,
            entityBreakdown,
            userBreakdown,
            dailyActivity,
            generatedAt: new Date(),
        };
        core_1.logger.info('Summary report generated', { totalActions });
        return report;
    }
    async getMostActiveUsers(limit = 10) {
        const safeLimit = Math.min(this.MAX_LIMIT, Math.max(1, limit));
        const result = await this.prisma.auditLog.groupBy({
            by: ['userId'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: safeLimit,
        });
        return result.map((item) => ({
            userId: item.userId || 'unknown',
            totalActions: item._count.id,
        }));
    }
    async getMostChangedEntities(limit = 10) {
        const safeLimit = Math.min(this.MAX_LIMIT, Math.max(1, limit));
        const result = await this.prisma.auditLog.groupBy({
            by: ['entityType'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: safeLimit,
        });
        return result.map((item) => ({
            entityType: item.entityType,
            totalChanges: item._count.id,
        }));
    }
    async getFailedAuditLogs(limit = 100) {
        const safeLimit = Math.min(500, Math.max(1, limit));
        core_1.logger.warn('Fetching failed audit logs', { limit: safeLimit });
        const logs = await this.prisma.auditLog.findMany({
            where: { status: 'failed' },
            orderBy: { timestamp: 'desc' },
            take: safeLimit,
            select: { id: true, userId: true, entityType: true, action: true, errorMessage: true, timestamp: true },
        });
        return logs.map((log) => ({
            id: log.id,
            userId: log.userId,
            entityType: log.entityType,
            action: log.action,
            errorMessage: log.errorMessage,
            timestamp: log.timestamp,
        }));
    }
    async getHourlyActivity(date = new Date()) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const logs = await this.prisma.auditLog.findMany({
            where: { timestamp: { gte: startOfDay, lte: endOfDay } },
            select: { timestamp: true },
        });
        const hourlyData = {};
        for (let h = 0; h < 24; h++)
            hourlyData[h] = 0;
        for (const log of logs) {
            hourlyData[log.timestamp.getHours()] = (hourlyData[log.timestamp.getHours()] || 0) + 1;
        }
        return { date: startOfDay.toISOString().split('T')[0], hourlyActivity: hourlyData };
    }
    async exportReport(startDate, endDate) {
        const report = await this.generateSummaryReport(startDate, endDate);
        return (0, core_1.toJSON)(report, { pretty: true });
    }
}
exports.AuditReportService = AuditReportService;
//# sourceMappingURL=audit-report.service.js.map