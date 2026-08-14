import type { ErrorCode, ErrorSeverity } from '../constants/error-codes';
export type AppErrorType = {
    code: ErrorCode;
    message: string;
    statusCode: number;
    severity: ErrorSeverity;
    details?: Record<string, any>;
    originalError?: Error;
    isOperational: boolean;
    timestamp: string;
};
export type ErrorContext = {
    userId?: string;
    requestId?: string;
    operation?: string;
    metadata?: Record<string, any>;
    source?: string;
};
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LoggerOptions = {
    level?: LogLevel;
    format?: 'json' | 'pretty';
    service?: string;
    enableConsole?: boolean;
    enableFile?: boolean;
};
export type BackoffOptions = {
    strategy: 'exponential' | 'fixed';
    delay?: number;
    multiplier?: number;
    maxDelay?: number;
    maxRetries?: number;
};
//# sourceMappingURL=errors.types.d.ts.map