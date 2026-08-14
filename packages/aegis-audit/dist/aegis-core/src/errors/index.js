"use strict";
// ============================================
// @aegis/core - Errors Barrel Export
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldAuditError = exports.isRetryableError = exports.isCriticalError = exports.getSeverity = exports.getCategory = exports.getHttpStatus = exports.ERROR_CATEGORY_MAP = exports.HTTP_STATUS_MAP = exports.ERROR_SEVERITY_MAP = exports.AuditAction = exports.ErrorCategory = exports.ErrorSeverity = exports.ErrorCodes = exports.ValidationError = exports.AppError = void 0;
// Hata sınıfları
var app_error_1 = require("./app-error");
Object.defineProperty(exports, "AppError", { enumerable: true, get: function () { return app_error_1.AppError; } });
var validation_error_1 = require("./validation-error");
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return validation_error_1.ValidationError; } });
// Constants'tan re-export (tek kaynak)
var error_codes_1 = require("../constants/error-codes");
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
//# sourceMappingURL=index.js.map