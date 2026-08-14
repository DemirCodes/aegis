/**
 * SİSTEMSEL HATA KODLARI
 *
 * Format: KATEGORI_ALTKATEGORI (string tabanlı, okunabilir)
 *
 * Kategori Yapısı:
 * - SECURITY    : Kimlik doğrulama, yetkilendirme, şifreleme hataları
 * - PERFORMANCE : Zaman aşımı, kaynak tükenmesi, aşırı yüklenme
 * - QUEUE       : Mesaj kuyruğu bağlantı, publish/consume, DLQ hataları
 * - DATABASE    : Veritabanı bağlantı, sorgu, deadlock, replikasyon hataları
 * - CACHE       : Önbellek bağlantı, okuma/yazma, bellek hataları
 * - EXTERNAL    : Dış API, webhook, email, ödeme servisi hataları
 * - STORAGE     : Dosya sistemi, disk, yedekleme hataları
 * - NETWORK     : DNS, proxy, firewall, bant genişliği hataları
 * - CRITICAL    : Sistem çöküşü, bellek yetersizliği, veri bozulması
 * - AUDIT       : Denetim loglama ve GDPR hataları
 * - RESILIENCE  : Circuit breaker, retry mekanizması hataları
 */
export declare const ErrorCodes: {
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly CONFLICT: "CONFLICT";
    readonly TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS";
    readonly SECURITY_TOKEN_EXPIRED: "SECURITY_TOKEN_EXPIRED";
    readonly SECURITY_TOKEN_INVALID: "SECURITY_TOKEN_INVALID";
    readonly SECURITY_TOKEN_MISSING: "SECURITY_TOKEN_MISSING";
    readonly SECURITY_CSRF_INVALID: "SECURITY_CSRF_INVALID";
    readonly SECURITY_BRUTE_FORCE: "SECURITY_BRUTE_FORCE";
    readonly SECURITY_IP_BLOCKED: "SECURITY_IP_BLOCKED";
    readonly SECURITY_ENCRYPTION_FAILED: "SECURITY_ENCRYPTION_FAILED";
    readonly SECURITY_HASH_FAILED: "SECURITY_HASH_FAILED";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly TOKEN_REVOKED: "TOKEN_REVOKED";
    readonly RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED";
    readonly IP_BLACKLISTED: "IP_BLACKLISTED";
    readonly RISK_SCORE_HIGH: "RISK_SCORE_HIGH";
    readonly PERFORMANCE_TIMEOUT: "PERFORMANCE_TIMEOUT";
    readonly PERFORMANCE_CPU_OVERLOAD: "PERFORMANCE_CPU_OVERLOAD";
    readonly PERFORMANCE_MEMORY_OVERLOAD: "PERFORMANCE_MEMORY_OVERLOAD";
    readonly PERFORMANCE_CONNECTION_POOL_EXHAUSTED: "PERFORMANCE_CONNECTION_POOL_EXHAUSTED";
    readonly PERFORMANCE_THREAD_POOL_EXHAUSTED: "PERFORMANCE_THREAD_POOL_EXHAUSTED";
    readonly PERFORMANCE_RESOURCE_LEAK: "PERFORMANCE_RESOURCE_LEAK";
    readonly QUEUE_CONNECTION_FAILED: "QUEUE_CONNECTION_FAILED";
    readonly QUEUE_PUBLISH_FAILED: "QUEUE_PUBLISH_FAILED";
    readonly QUEUE_CONSUME_FAILED: "QUEUE_CONSUME_FAILED";
    readonly QUEUE_DLQ_FULL: "QUEUE_DLQ_FULL";
    readonly QUEUE_RETRY_EXHAUSTED: "QUEUE_RETRY_EXHAUSTED";
    readonly QUEUE_BACKPRESSURE: "QUEUE_BACKPRESSURE";
    readonly QUEUE_JOB_FAILED: "QUEUE_JOB_FAILED";
    readonly DLQ_PROCESSING_FAILED: "DLQ_PROCESSING_FAILED";
    readonly DB_CONNECTION_FAILED: "DB_CONNECTION_FAILED";
    readonly DB_CONNECTION_TIMEOUT: "DB_CONNECTION_TIMEOUT";
    readonly DB_QUERY_FAILED: "DB_QUERY_FAILED";
    readonly DB_QUERY_TIMEOUT: "DB_QUERY_TIMEOUT";
    readonly DB_DEADLOCK: "DB_DEADLOCK";
    readonly DB_MIGRATION_FAILED: "DB_MIGRATION_FAILED";
    readonly DB_REPLICATION_LAG: "DB_REPLICATION_LAG";
    readonly DB_POOL_EXHAUSTED: "DB_POOL_EXHAUSTED";
    readonly DB_CORRUPTED_DATA: "DB_CORRUPTED_DATA";
    readonly CACHE_CONNECTION_FAILED: "CACHE_CONNECTION_FAILED";
    readonly CACHE_READ_FAILED: "CACHE_READ_FAILED";
    readonly CACHE_WRITE_FAILED: "CACHE_WRITE_FAILED";
    readonly CACHE_INVALIDATION_FAILED: "CACHE_INVALIDATION_FAILED";
    readonly CACHE_MEMORY_FULL: "CACHE_MEMORY_FULL";
    readonly CACHE_MISS: "CACHE_MISS";
    readonly CACHE_ERROR: "CACHE_ERROR";
    readonly EXTERNAL_API_TIMEOUT: "EXTERNAL_API_TIMEOUT";
    readonly EXTERNAL_API_FAILED: "EXTERNAL_API_FAILED";
    readonly EXTERNAL_SERVICE_UNAVAILABLE: "EXTERNAL_SERVICE_UNAVAILABLE";
    readonly EXTERNAL_CIRCUIT_BREAKER_OPEN: "EXTERNAL_CIRCUIT_BREAKER_OPEN";
    readonly EXTERNAL_DNS_RESOLUTION_FAILED: "EXTERNAL_DNS_RESOLUTION_FAILED";
    readonly STORAGE_DISK_FULL: "STORAGE_DISK_FULL";
    readonly STORAGE_READ_FAILED: "STORAGE_READ_FAILED";
    readonly STORAGE_WRITE_FAILED: "STORAGE_WRITE_FAILED";
    readonly STORAGE_FILE_NOT_FOUND: "STORAGE_FILE_NOT_FOUND";
    readonly STORAGE_FILE_TOO_LARGE: "STORAGE_FILE_TOO_LARGE";
    readonly STORAGE_BACKUP_FAILED: "STORAGE_BACKUP_FAILED";
    readonly NETWORK_CONNECTION_FAILED: "NETWORK_CONNECTION_FAILED";
    readonly NETWORK_DNS_FAILED: "NETWORK_DNS_FAILED";
    readonly NETWORK_TIMEOUT: "NETWORK_TIMEOUT";
    readonly NETWORK_BANDWIDTH_EXCEEDED: "NETWORK_BANDWIDTH_EXCEEDED";
    readonly CRITICAL_SYSTEM_PANIC: "CRITICAL_SYSTEM_PANIC";
    readonly CRITICAL_OUT_OF_MEMORY: "CRITICAL_OUT_OF_MEMORY";
    readonly CRITICAL_SERVICE_HEALTH_FAILED: "CRITICAL_SERVICE_HEALTH_FAILED";
    readonly CRITICAL_STARTUP_FAILED: "CRITICAL_STARTUP_FAILED";
    readonly CRITICAL_DATA_CORRUPTION: "CRITICAL_DATA_CORRUPTION";
    readonly CRITICAL_DEADLOCK: "CRITICAL_DEADLOCK";
    readonly AUDIT_LOG_FAILED: "AUDIT_LOG_FAILED";
    readonly GDPR_DELETION_FAILED: "GDPR_DELETION_FAILED";
    readonly CIRCUIT_OPEN: "CIRCUIT_OPEN";
    readonly RETRY_EXHAUSTED: "RETRY_EXHAUSTED";
};
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
export declare const ErrorSeverity: {
    readonly DEBUG: 0;
    readonly INFO: 1;
    readonly WARNING: 2;
    readonly ERROR: 3;
    readonly CRITICAL: 4;
};
export type ErrorSeverity = (typeof ErrorSeverity)[keyof typeof ErrorSeverity];
export declare const ERROR_SEVERITY_MAP: Record<ErrorCode, ErrorSeverity>;
export declare const HTTP_STATUS_MAP: Record<ErrorCode, number>;
export declare const ErrorCategory: {
    readonly SECURITY: "SECURITY";
    readonly PERFORMANCE: "PERFORMANCE";
    readonly QUEUE: "QUEUE";
    readonly DATABASE: "DATABASE";
    readonly CACHE: "CACHE";
    readonly EXTERNAL: "EXTERNAL";
    readonly STORAGE: "STORAGE";
    readonly NETWORK: "NETWORK";
    readonly CRITICAL: "CRITICAL";
    readonly AUDIT: "AUDIT";
    readonly RESILIENCE: "RESILIENCE";
    readonly GENERAL: "GENERAL";
};
export type ErrorCategory = (typeof ErrorCategory)[keyof typeof ErrorCategory];
export declare const ERROR_CATEGORY_MAP: Record<ErrorCode, ErrorCategory>;
export declare const AuditAction: {
    readonly SYSTEM_STARTUP: "SYSTEM_STARTUP";
    readonly SYSTEM_SHUTDOWN: "SYSTEM_SHUTDOWN";
    readonly CONFIG_CHANGE: "CONFIG_CHANGE";
    readonly DATA_CREATE: "DATA_CREATE";
    readonly DATA_READ: "DATA_READ";
    readonly DATA_UPDATE: "DATA_UPDATE";
    readonly DATA_DELETE: "DATA_DELETE";
    readonly USER_LOGIN: "USER_LOGIN";
    readonly USER_LOGOUT: "USER_LOGOUT";
    readonly USER_LOCKED: "USER_LOCKED";
    readonly PERMISSION_CHANGE: "PERMISSION_CHANGE";
    readonly ROLE_CHANGE: "ROLE_CHANGE";
    readonly ERROR_OCCURRED: "ERROR_OCCURRED";
};
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
export declare const getHttpStatus: (code: ErrorCode) => number;
export declare const getCategory: (code: ErrorCode) => ErrorCategory;
export declare const getSeverity: (code: ErrorCode) => ErrorSeverity;
export declare const isCriticalError: (code: ErrorCode) => boolean;
export declare const isRetryableError: (code: ErrorCode) => boolean;
export declare const shouldAuditError: (code: ErrorCode) => boolean;
//# sourceMappingURL=error-codes.d.ts.map