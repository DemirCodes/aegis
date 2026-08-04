import { AppErrorType, ErrorContext } from '../types/errors.types.js';
import { logger } from './logger.js';

export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public details?: Record<string, any>;

  constructor(code: string, message: string, statusCode: number = 500, details?: Record<string, any>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON(): AppErrorType {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export function handleError(error: Error, context?: ErrorContext): AppErrorType {
  // Production'da internal detayları gizle
  const isProduction = process.env.NODE_ENV === 'production';

  if (error instanceof AppError) {
    logger.error(error.message, error, context);
    return {
      code: error.code,
      message: isProduction && error.statusCode === 500 ? 'Internal server error' : error.message,
      statusCode: error.statusCode,
      details: isProduction ? undefined : error.details,
    };
  }

  logger.error(error.message, error, context);

  return {
    code: 'INTERNAL_ERROR',
    message: isProduction ? 'Internal server error' : error.message,
    statusCode: 500,
  };
}