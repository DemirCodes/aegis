import { ErrorCode, ErrorSeverity } from '../constants/error-codes';
export interface AppErrorOptions {
    code: ErrorCode;
    message?: string;
    statusCode?: number;
    severity?: ErrorSeverity;
    details?: Record<string, any>;
    originalError?: Error;
    isOperational?: boolean;
}
export declare class AppError extends Error {
    readonly code: ErrorCode;
    readonly statusCode: number;
    readonly severity: ErrorSeverity;
    readonly details?: Record<string, any>;
    readonly originalError?: Error;
    readonly isOperational: boolean;
    readonly timestamp: string;
    constructor(options: AppErrorOptions);
    isCritical(): boolean;
    isRetryable(): boolean;
    shouldAudit(): boolean;
    toJSON(): Record<string, any>;
    static internal(message?: string, details?: Record<string, any>): AppError;
    static notFound(resource?: string, details?: Record<string, any>): AppError;
    static validation(message?: string, details?: Record<string, any>): AppError;
    static unauthorized(message?: string, details?: Record<string, any>): AppError;
    static forbidden(message?: string, details?: Record<string, any>): AppError;
    static conflict(message?: string, details?: Record<string, any>): AppError;
    static tooManyRequests(message?: string, details?: Record<string, any>): AppError;
}
//# sourceMappingURL=app-error.d.ts.map