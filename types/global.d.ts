declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      DATABASE_TEST_URL: string;
      REDIS_URL: string;
      NODE_ENV: 'development' | 'test' | 'production';
      LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
    }
  }

  interface PaginationOptions {
    page?: number;
    pageSize?: number;
    sort?: string[];
  }

  interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }

  interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
    metadata?: Record<string, any>;
    timestamp: Date;
  }

  interface ApiError {
    code: string;
    message: string;
    details?: Record<string, any>;
    path?: string[];
  }

  interface Timestamps {
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
  }
}

export {};