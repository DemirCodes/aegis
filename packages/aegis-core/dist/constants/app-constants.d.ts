export declare const APP_NAME = "AEGIS";
export declare const APP_VERSION = "0.1.0";
export declare const AUDIT_DEFAULT_RETENTION_DAYS = 90;
export declare const AUDIT_MAX_BATCH_SIZE = 1000;
export declare const AUDIT_FLUSH_INTERVAL_MS = 5000;
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const MAX_PAGE_SIZE = 100;
export declare const DEFAULT_CACHE_TTL = 3600;
export declare const DEFAULT_RATE_LIMIT_WINDOW = 60000;
export declare const DEFAULT_RATE_LIMIT_MAX = 100;
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly SERVICE_UNAVAILABLE: 503;
};
export type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];
//# sourceMappingURL=app-constants.d.ts.map