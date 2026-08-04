// ============================================
// @aegis/core - Error Types
// ============================================

export type AppErrorType = {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
  originalError?: Error;
  timestamp?: Date;
};

export type ErrorContext = {
  userId?: string;
  requestId?: string;
  operation?: string;
  metadata?: Record<string, any>;
};