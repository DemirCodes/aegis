// ============================================
// @aegis/core - Shared Utilities
// ============================================

// Types
export * from './types/common.types.js';
export * from './types/errors.types.js';

// Utils
export { createLogger, logger } from './utils/logger.js';
export { 
  AppError, 
  DatabaseError, 
  NetworkError, 
  AuthError, 
  RateLimitError, 
  NotFoundError,
  handleError,
  errorMiddleware 
} from './utils/error-handler.js';
export { loadEnv } from './utils/env-loader.js';
export { delay, toJSON } from './utils/common-helpers.js';
export { generateId, generateUUID } from './utils/id-generator.js';
export { retry } from './utils/retry.js';

// Constants
export * from './constants/app-constants.js';
export * from './constants/error-codes.js';

// Errors
export { AppError as CoreAppError } from './errors/app-error.js';
export { ValidationError } from './errors/validation-error.js';
export { ErrorCodes } from './errors/error-codes.js';

// Decorators
export { Deprecated } from './decorators/deprecated.decorator.js';