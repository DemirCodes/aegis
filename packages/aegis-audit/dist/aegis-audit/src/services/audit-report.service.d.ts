import { PrismaClient } from '@prisma/client';
interface SummaryReport {
    period: {
        startDate: Date;
        endDate: Date;
    };
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
export declare class AuditReportService {
    private readonly MAX_LIMIT;
    private prisma;
    constructor(prisma: PrismaClient);
    generateSummaryReport(startDate: Date, endDate: Date): Promise<SummaryReport>;
    getMostActiveUsers(limit?: number): Promise<ActiveUser[]>;
    getMostChangedEntities(limit?: number): Promise<ChangedEntity[]>;
    getFailedAuditLogs(limit?: number): Promise<FailedAuditLogEntry[]>;
    getHourlyActivity(date?: Date): Promise<HourlyActivity>;
    exportReport(startDate: Date, endDate: Date): Promise<string>;
}
export {};
//# sourceMappingURL=audit-report.service.d.ts.map