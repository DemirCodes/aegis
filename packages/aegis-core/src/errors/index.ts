// ============================================
// @aegis/core - Errors Barrel Export
// ============================================

// Hata sınıfları
export { AppError } from './app-error';
export type { AppErrorOptions } from './app-error';

export { ValidationError } from './validation-error';
export type { ValidationErrorItem } from './validation-error';

// Constants'tan re-export (tek kaynak)
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
} from '../constants/error-codes';

export type { ErrorCode } from '../constants/error-codes';