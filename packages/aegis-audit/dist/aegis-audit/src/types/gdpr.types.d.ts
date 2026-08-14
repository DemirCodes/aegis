export type GDPRErasureResult = {
    userId: string;
    status: 'completed' | 'pending' | 'failed';
    erasedAt: Date;
    tablesAffected: string[];
    recordsDeleted: number;
    errors?: string[];
};
export type UserDataExport = {
    userId: string;
    exportedAt: Date;
    data: {
        profile: any;
        activities: any[];
        auditLogs: any[];
        metadata: Record<string, any>;
    };
    format: 'json' | 'csv';
};
export type AnonymizationResult = {
    userId: string;
    anonymizedAt: Date;
    fieldsAnonymized: string[];
    status: 'completed' | 'partial' | 'failed';
};
export type CascadeDeletePlan = {
    userId: string;
    tables: Array<{
        table: string;
        recordCount: number;
        cascadeDepth: number;
    }>;
    totalRecordsToDelete: number;
    estimatedDuration: number;
};
export type ErasureVerification = {
    userId: string;
    isComplete: boolean;
    orphanedRecords: Array<{
        table: string;
        count: number;
    }>;
    verifiedAt: Date;
    status: 'clean' | 'has_orphans' | 'incomplete';
};
export type ScheduledErasure = {
    userId: string;
    scheduledAt: Date;
    status: 'scheduled' | 'executed' | 'cancelled';
    createdAt: Date;
    canBeCancelled: boolean;
};
//# sourceMappingURL=gdpr.types.d.ts.map