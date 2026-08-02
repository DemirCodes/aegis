// ============================================
// @aegis/core - Error Handler
// ============================================

import { AppErrorType, ErrorContext } from '../types/errors.types';
import { logger } from './logger';

export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public details?: Record<string, any>;
  public originalError?: Error;

  constructor(code: string, message: string, statusCode: number = 500, details?: Record<string, any>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function handleError(error: Error, context?: ErrorContext): AppErrorType {
  if (error instanceof AppError) {
    logger.error(error.message, error, { ...context, code: error.code });
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      originalError: error,
    };
  }

  logger.error(error.message, error, context);

  return {
    code: 'INTERNAL_ERROR',
    message: error.message || 'An unexpected error occurred',
    statusCode: 500,
    originalError: error,
  };
}