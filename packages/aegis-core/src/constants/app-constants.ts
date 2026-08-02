// ============================================
// @aegis/core - Application Constants
// ============================================

export const APP_NAME = 'AEGIS';
export const APP_VERSION = '0.1.0';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const DEFAULT_CACHE_TTL = 3600;
export const DEFAULT_RATE_LIMIT_WINDOW = 60000;
export const DEFAULT_RATE_LIMIT_MAX = 100;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;