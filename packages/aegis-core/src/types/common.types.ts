// ============================================
// @aegis/core - Common Types
// ============================================

export type PaginationOptions = {
  page?: number;
  pageSize?: number;
  sort?: string[];
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: Record<string, any>;
  timestamp: Date;
};

export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, any>;
  path?: string[];
};

export type Timestamps = {
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};

export type Status = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';

export type AuditMetadata = {
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
};

export type DatabaseConfig = {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
};

export type RedisConfig = {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
};