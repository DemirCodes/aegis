// ============================================
// @aegis/core - Shared Utilities
// ============================================

// Types
export * from './types/common.types';
export * from './types/errors.types';

// Utils
export { createLogger, logger } from './utils/logger';
export { 
  AppError, 
  DatabaseError, 
  NetworkError, 
  AuthError, 
  RateLimitError, 
  NotFoundError,
  handleError,
  errorMiddleware 
} from './utils/error-handler';
export { loadEnv } from './utils/env-loader';
export { delay, toJSON } from './utils/common-helpers';
export { generateId, generateUUID } from './utils/id-generator';
export { retry } from './utils/retry';

// Constants
export * from './constants/app-constants';
export * from './constants/error-codes';

// Errors
export { AppError as CoreAppError } from './errors/app-error';
export { ValidationError } from './errors/validation-error';
export { ErrorCodes } from './errors/error-codes';

// Decorators
export { Deprecated } from './decorators/deprecated.decorator';