// ============================================
// @aegis/core - Ana Barrel Export
// Framework'un tüm public API'sini tek noktadan dışa aktarır
// ============================================

// --- CONSTANTS (Sabitler) ---
export {
  APP_NAME,
  APP_VERSION,
  AUDIT_DEFAULT_RETENTION_DAYS,
  AUDIT_MAX_BATCH_SIZE,
  AUDIT_FLUSH_INTERVAL_MS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  DEFAULT_CACHE_TTL,
  DEFAULT_RATE_LIMIT_WINDOW,
  DEFAULT_RATE_LIMIT_MAX,
  HTTP_STATUS,
} from './constants/app-constants';
export type { HttpStatusCode } from './constants/app-constants';

export {
  ErrorCodes,
  ErrorSeverity,
  ErrorCategory,
  AuditAction,
  ERROR_SEVERITY_MAP,
  HTTP_STATUS_MAP,
  ERROR_CATEGORY_MAP,
  getHttpStatus,
  getCategory,
  getSeverity,
  isCriticalError,
  isRetryableError,
  shouldAuditError,
} from './constants/error-codes';
export type { ErrorCode } from './constants/error-codes';

// --- TYPES (Tip Tanımları) ---
export type {
  PaginationOptions,
  PaginatedResult,
  ApiResponse,
  ApiError,
  Timestamps,
  Status,
  AuditMetadata,
  DatabaseConfig,
  RedisConfig,
  SerializationOptions,
} from './types/common.types';

export type {
  AppErrorType,
  ErrorContext,
  LogLevel,
  LoggerOptions,
  BackoffOptions,
} from './types/errors.types';

// --- ERRORS (Hata Sınıfları) ---
export { AppError } from './errors/app-error';
export type { AppErrorOptions } from './errors/app-error';

export { ValidationError } from './errors/validation-error';
export type { ValidationErrorItem } from './errors/validation-error';

// --- UTILS (Yardımcı Fonksiyonlar) ---

// Logger
export { createLogger, logger } from './utils/logger';

// Error Handler
export { handleError } from './utils/error-handler';

// Environment Loader
export { loadEnv } from './utils/env-loader';

// Common Helpers
export { delay, toJSON } from './utils/common-helpers';

// ID Generator
export { generateId, generateUUID } from './utils/id-generator';

// Retry
export { retry } from './utils/retry';
export type { RetryOptions } from './utils/retry';

// --- DECORATORS (Dekoratörler) ---
export { Deprecated } from './decorators/deprecated.decorator';