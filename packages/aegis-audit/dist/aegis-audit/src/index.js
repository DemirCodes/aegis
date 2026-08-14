"use strict";
// ============================================
// @aegis/audit - Main Entry Point
// ============================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGDPREngine = exports.gdprExportHandler = exports.gdprErasureHandler = exports.initializeSoftDeleteMiddleware = exports.softDeleteFilter = exports.initializeAuditMiddleware = exports.excludeFromAudit = exports.auditMiddleware = exports.initializeSoftDelete = exports.SoftDelete = exports.initializeAudit = exports.Audited = exports.AuditReportService = exports.GDPRDeletionService = exports.AuditTrailService = void 0;
// Types
__exportStar(require("./types/audit.types"), exports);
__exportStar(require("./types/gdpr.types"), exports);
// Services
var audit_trail_service_1 = require("./services/audit-trail.service");
Object.defineProperty(exports, "AuditTrailService", { enumerable: true, get: function () { return audit_trail_service_1.AuditTrailService; } });
var gdpr_deletion_service_1 = require("./services/gdpr-deletion.service");
Object.defineProperty(exports, "GDPRDeletionService", { enumerable: true, get: function () { return gdpr_deletion_service_1.GDPRDeletionService; } });
var audit_report_service_1 = require("./services/audit-report.service");
Object.defineProperty(exports, "AuditReportService", { enumerable: true, get: function () { return audit_report_service_1.AuditReportService; } });
// Decorators
var audited_decorator_1 = require("./decorators/audited.decorator");
Object.defineProperty(exports, "Audited", { enumerable: true, get: function () { return audited_decorator_1.Audited; } });
Object.defineProperty(exports, "initializeAudit", { enumerable: true, get: function () { return audited_decorator_1.initializeAudit; } });
var soft_delete_decorator_1 = require("./decorators/soft-delete.decorator");
Object.defineProperty(exports, "SoftDelete", { enumerable: true, get: function () { return soft_delete_decorator_1.SoftDelete; } });
Object.defineProperty(exports, "initializeSoftDelete", { enumerable: true, get: function () { return soft_delete_decorator_1.initializeSoftDelete; } });
// Middleware
var audit_middleware_1 = require("./middleware/audit.middleware");
Object.defineProperty(exports, "auditMiddleware", { enumerable: true, get: function () { return audit_middleware_1.auditMiddleware; } });
Object.defineProperty(exports, "excludeFromAudit", { enumerable: true, get: function () { return audit_middleware_1.excludeFromAudit; } });
Object.defineProperty(exports, "initializeAuditMiddleware", { enumerable: true, get: function () { return audit_middleware_1.initializeAuditMiddleware; } });
var soft_delete_middleware_1 = require("./middleware/soft-delete.middleware");
Object.defineProperty(exports, "softDeleteFilter", { enumerable: true, get: function () { return soft_delete_middleware_1.softDeleteFilter; } });
Object.defineProperty(exports, "initializeSoftDeleteMiddleware", { enumerable: true, get: function () { return soft_delete_middleware_1.initializeSoftDeleteMiddleware; } });
var gdpr_engine_1 = require("./middleware/gdpr-engine");
Object.defineProperty(exports, "gdprErasureHandler", { enumerable: true, get: function () { return gdpr_engine_1.gdprErasureHandler; } });
Object.defineProperty(exports, "gdprExportHandler", { enumerable: true, get: function () { return gdpr_engine_1.gdprExportHandler; } });
Object.defineProperty(exports, "initializeGDPREngine", { enumerable: true, get: function () { return gdpr_engine_1.initializeGDPREngine; } });
// Utils
__exportStar(require("./utils/audit-helpers"), exports);
//# sourceMappingURL=index.js.map