"use strict";
// ============================================
// @aegis/core - Ana Barrel Export
// Framework'un tüm public API'sini tek noktadan dışa aktarır
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deprecated = exports.retry = exports.generateUUID = exports.generateId = exports.toJSON = exports.delay = exports.loadEnv = exports.handleError = exports.logger = exports.createLogger = exports.ValidationError = exports.AppError = exports.shouldAuditError = exports.isRetryableError = exports.isCriticalError = exports.getSeverity = exports.getCategory = exports.getHttpStatus = exports.ERROR_CATEGORY_MAP = exports.HTTP_STATUS_MAP = exports.ERROR_SEVERITY_MAP = exports.AuditAction = exports.ErrorCategory = exports.ErrorSeverity = exports.ErrorCodes = exports.HTTP_STATUS = exports.DEFAULT_RATE_LIMIT_MAX = exports.DEFAULT_RATE_LIMIT_WINDOW = exports.DEFAULT_CACHE_TTL = exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = exports.AUDIT_FLUSH_INTERVAL_MS = exports.AUDIT_MAX_BATCH_SIZE = exports.AUDIT_DEFAULT_RETENTION_DAYS = exports.APP_VERSION = exports.APP_NAME = void 0;
// --- CONSTANTS (Sabitler) ---
var app_constants_1 = require("./constants/app-constants");
Object.defineProperty(exports, "APP_NAME", { enumerable: true, get: function () { return app_constants_1.APP_NAME; } });
Object.defineProperty(exports, "APP_VERSION", { enumerable: true, get: function () { return app_constants_1.APP_VERSION; } });
Object.defineProperty(exports, "AUDIT_DEFAULT_RETENTION_DAYS", { enumerable: true, get: function () { return app_constants_1.AUDIT_DEFAULT_RETENTION_DAYS; } });
Object.defineProperty(exports, "AUDIT_MAX_BATCH_SIZE", { enumerable: true, get: function () { return app_constants_1.AUDIT_MAX_BATCH_SIZE; } });
Object.defineProperty(exports, "AUDIT_FLUSH_INTERVAL_MS", { enumerable: true, get: function () { return app_constants_1.AUDIT_FLUSH_INTERVAL_MS; } });
Object.defineProperty(exports, "DEFAULT_PAGE_SIZE", { enumerable: true, get: function () { return app_constants_1.DEFAULT_PAGE_SIZE; } });
Object.defineProperty(exports, "MAX_PAGE_SIZE", { enumerable: true, get: function () { return app_constants_1.MAX_PAGE_SIZE; } });
Object.defineProperty(exports, "DEFAULT_CACHE_TTL", { enumerable: true, get: function () { return app_constants_1.DEFAULT_CACHE_TTL; } });
Object.defineProperty(exports, "DEFAULT_RATE_LIMIT_WINDOW", { enumerable: true, get: function () { return app_constants_1.DEFAULT_RATE_LIMIT_WINDOW; } });
Object.defineProperty(exports, "DEFAULT_RATE_LIMIT_MAX", { enumerable: true, get: function () { return app_constants_1.DEFAULT_RATE_LIMIT_MAX; } });
Object.defineProperty(exports, "HTTP_STATUS", { enumerable: true, get: function () { return app_constants_1.HTTP_STATUS; } });
var error_codes_1 = require("./constants/error-codes");
Object.defineProperty(exports, "ErrorCodes", { enumerable: true, get: function () { return error_codes_1.ErrorCodes; } });
Object.defineProperty(exports, "ErrorSeverity", { enumerable: true, get: function () { return error_codes_1.ErrorSeverity; } });
Object.defineProperty(exports, "ErrorCategory", { enumerable: true, get: function () { return error_codes_1.ErrorCategory; } });
Object.defineProperty(exports, "AuditAction", { enumerable: true, get: function () { return error_codes_1.AuditAction; } });
Object.defineProperty(exports, "ERROR_SEVERITY_MAP", { enumerable: true, get: function () { return error_codes_1.ERROR_SEVERITY_MAP; } });
Object.defineProperty(exports, "HTTP_STATUS_MAP", { enumerable: true, get: function () { return error_codes_1.HTTP_STATUS_MAP; } });
Object.defineProperty(exports, "ERROR_CATEGORY_MAP", { enumerable: true, get: function () { return error_codes_1.ERROR_CATEGORY_MAP; } });
Object.defineProperty(exports, "getHttpStatus", { enumerable: true, get: function () { return error_codes_1.getHttpStatus; } });
Object.defineProperty(exports, "getCategory", { enumerable: true, get: function () { return error_codes_1.getCategory; } });
Object.defineProperty(exports, "getSeverity", { enumerable: true, get: function () { return error_codes_1.getSeverity; } });
Object.defineProperty(exports, "isCriticalError", { enumerable: true, get: function () { return error_codes_1.isCriticalError; } });
Object.defineProperty(exports, "isRetryableError", { enumerable: true, get: function () { return error_codes_1.isRetryableError; } });
Object.defineProperty(exports, "shouldAuditError", { enumerable: true, get: function () { return error_codes_1.shouldAuditError; } });
// --- ERRORS (Hata Sınıfları) ---
var app_error_1 = require("./errors/app-error");
Object.defineProperty(exports, "AppError", { enumerable: true, get: function () { return app_error_1.AppError; } });
var validation_error_1 = require("./errors/validation-error");
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return validation_error_1.ValidationError; } });
// --- UTILS (Yardımcı Fonksiyonlar) ---
// Logger
var logger_1 = require("./utils/logger");
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return logger_1.createLogger; } });
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_1.logger; } });
// Error Handler
var error_handler_1 = require("./utils/error-handler");
Object.defineProperty(exports, "handleError", { enumerable: true, get: function () { return error_handler_1.handleError; } });
// Environment Loader
var env_loader_1 = require("./utils/env-loader");
Object.defineProperty(exports, "loadEnv", { enumerable: true, get: function () { return env_loader_1.loadEnv; } });
// Common Helpers
var common_helpers_1 = require("./utils/common-helpers");
Object.defineProperty(exports, "delay", { enumerable: true, get: function () { return common_helpers_1.delay; } });
Object.defineProperty(exports, "toJSON", { enumerable: true, get: function () { return common_helpers_1.toJSON; } });
// ID Generator
var id_generator_1 = require("./utils/id-generator");
Object.defineProperty(exports, "generateId", { enumerable: true, get: function () { return id_generator_1.generateId; } });
Object.defineProperty(exports, "generateUUID", { enumerable: true, get: function () { return id_generator_1.generateUUID; } });
// Retry
var retry_1 = require("./utils/retry");
Object.defineProperty(exports, "retry", { enumerable: true, get: function () { return retry_1.retry; } });
// --- DECORATORS (Dekoratörler) ---
var deprecated_decorator_1 = require("./decorators/deprecated.decorator");
Object.defineProperty(exports, "Deprecated", { enumerable: true, get: function () { return deprecated_decorator_1.Deprecated; } });
//# sourceMappingURL=index.js.map