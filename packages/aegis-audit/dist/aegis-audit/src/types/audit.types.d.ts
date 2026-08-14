export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type AuditStatus = 'completed' | 'failed';
export type AuditMetadata = {
    ipAddress?: string;
    userAgent?: string;
    correlationId?: string;
    customFields?: Record<string, any>;
};
export type AuditLog = {
    id: string;
    userId: string;
    entityType: string;
    entityId: string;
    action: AuditAction;
    changes: Record<string, {
        old: any;
        new: any;
    }>;
    changesSummary?: string;
    metadata?: AuditMetadata;
    timestamp: Date;
    status: AuditStatus;
    errorMessage?: string;
};
export type AuditFilters = {
    userId?: string;
    entityType?: string;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    entityId?: string;
};
export type PaginationOptions = {
    page?: number;
    pageSize?: number;
    sort?: string[];
};
export type PaginatedAuditLogs = {
    data: AuditLog[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
};
export type UserActivityLog = {
    timestamp: Date;
    action: string;
    entity: string;
    entityId: string;
    changes: Record<string, any>;
    ipAddress?: string;
};
export type ActivityHistoryOptions = {
    limit?: number;
    includeFailures?: boolean;
    entityFilters?: string[];
};
export type ExportFormat = 'pdf' | 'csv' | 'json';
export type AuditedOptions = {
    include?: string[];
    exclude?: string[];
    trackDeletes?: boolean;
    sensitive?: boolean;
    customFields?: Record<string, any>;
};
//# sourceMappingURL=audit.types.d.ts.map