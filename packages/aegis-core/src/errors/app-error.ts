// ============================================
// @aegis/core - App Error
// ============================================

export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public details?: Record<string, any>;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: Record<string, any>,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}