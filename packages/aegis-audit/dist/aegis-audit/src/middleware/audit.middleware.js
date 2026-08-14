"use strict";
// ============================================
// @aegis/audit - Audit Middleware
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAuditMiddleware = initializeAuditMiddleware;
exports.auditMiddleware = auditMiddleware;
exports.excludeFromAudit = excludeFromAudit;
const audit_trail_service_1 = require("../services/audit-trail.service");
const audit_helpers_1 = require("../utils/audit-helpers");
let auditService = null;
/**
 * Audit middleware'i initialize et
 */
function initializeAuditMiddleware(prisma) {
    auditService = new audit_trail_service_1.AuditTrailService(prisma);
}
/**
 * Tüm API isteklerini audit trail'e kaydeden middleware
 * Hassas endpoint'leri (login, register) log'lamaz
 */
function auditMiddleware(req, res, next) {
    // Audit atlanacak mı?
    if (req.__skipAudit) {
        return next();
    }
    const startTime = Date.now();
    // Response finish olduğunda log'la
    res.on('finish', async () => {
        if (!auditService)
            return;
        try {
            const duration = Date.now() - startTime;
            const { method, originalUrl } = req;
            const statusCode = res.statusCode;
            const ipAddress = (0, audit_helpers_1.getClientIp)(req);
            const userAgent = (0, audit_helpers_1.getUserAgent)(req);
            const userId = req.user?.id || 'anonymous';
            // Health check ve metrics endpoint'lerini log'lama
            const skipEndpoints = ['/health', '/metrics', '/favicon.ico'];
            if (skipEndpoints.some((ep) => originalUrl.includes(ep))) {
                return;
            }
            // Hassas endpoint'leri log'lama
            const sensitiveEndpoints = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/token'];
            if (sensitiveEndpoints.some((ep) => originalUrl.includes(ep))) {
                return;
            }
            // Sadece 4xx ve 5xx hatalarını veya POST/PUT/DELETE işlemlerini log'la
            // GET isteklerini sadece hata durumunda log'la
            if (method === 'GET' && statusCode < 400) {
                return;
            }
            let action = 'UPDATE';
            if (method === 'POST')
                action = 'CREATE';
            else if (method === 'DELETE')
                action = 'DELETE';
            await auditService.createAuditLog(userId, 'API_REQUEST', action, {
                endpoint: originalUrl,
                method,
                statusCode,
                duration: `${duration}ms`,
            }, {
                ipAddress,
                userAgent,
                correlationId: req.headers['x-correlation-id'] || req.headers['x-request-id'],
            });
        }
        catch (error) {
            // Audit log hatası uygulamayı etkilemesin
            console.error('Audit middleware error:', error);
        }
    });
    next();
}
/**
 * Belirli endpoint'leri audit'ten hariç tutan middleware
 */
function excludeFromAudit(paths) {
    return (req, _res, next) => {
        if (paths.some((p) => req.originalUrl.includes(p))) {
            req.__skipAudit = true;
        }
        next();
    };
}
//# sourceMappingURL=audit.middleware.js.map