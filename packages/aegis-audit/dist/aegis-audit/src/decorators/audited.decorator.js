"use strict";
// ============================================
// @aegis/audit - @Audited Decorator
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAudit = initializeAudit;
exports.Audited = Audited;
const audit_trail_service_1 = require("../services/audit-trail.service");
const audit_helpers_1 = require("../utils/audit-helpers");
let auditService = null;
/**
 * Audit servisini initialize et
 */
function initializeAudit(prisma, sensitiveFields) {
    auditService = new audit_trail_service_1.AuditTrailService(prisma, sensitiveFields);
}
/**
 * Metod çağrılarını otomatik audit trail'e kaydeden decorator
 *
 * @param options - Audit seçenekleri
 * @param options.include - Hangi field'lar log'lansın (whitelist)
 * @param options.exclude - Hangi field'lar log'lanmasın (blacklist)
 * @param options.trackDeletes - Delete işlemleri track edilsin mi?
 * @param options.sensitive - Hassas veri işleme modu
 * @param options.customFields - Ekstra metadata
 */
function Audited(options = {}) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const { include, exclude = [], trackDeletes = true, sensitive = false, customFields } = options;
            // Audit servisi yoksa orijinal metodu çağır
            if (!auditService) {
                return originalMethod.apply(this, args);
            }
            const startTime = Date.now();
            let result;
            try {
                // Metodu çağır
                result = await originalMethod.apply(this, args);
                // Entity bilgilerini çıkar
                const entityType = target.constructor.name.replace('Service', '');
                // İlk argüman genelde entity ID'sidir
                const firstArg = args[0];
                const entityId = typeof firstArg === 'string' ? firstArg : (result?.id || result?.orderNumber || 'unknown');
                // Request context'ini bul (Express req genelde son parametredir)
                const req = args[args.length - 1];
                const isRequest = req && typeof req === 'object' && (req.ip || req.headers || req.socket);
                const ipAddress = isRequest ? (0, audit_helpers_1.getClientIp)(req) : undefined;
                const userAgent = isRequest ? (0, audit_helpers_1.getUserAgent)(req) : undefined;
                const userId = isRequest && req.user?.id ? req.user.id : 'system';
                const correlationId = isRequest && req.headers?.['x-correlation-id']
                    ? req.headers['x-correlation-id']
                    : undefined;
                // Aksiyonu belirle
                let action = 'UPDATE';
                if (propertyKey.startsWith('create') || propertyKey.startsWith('add')) {
                    action = 'CREATE';
                }
                else if (propertyKey.startsWith('delete') || propertyKey.startsWith('remove')) {
                    if (!trackDeletes)
                        return result;
                    action = 'DELETE';
                }
                // Değişiklikleri hesapla (önceki veri yoksa boş obje kullan)
                const oldData = args[1] || {};
                const changes = (0, audit_helpers_1.diffChanges)(oldData, result || {}, exclude);
                // Eğer include varsa sadece o field'ları al
                let filteredChanges = changes;
                if (include?.length) {
                    filteredChanges = {};
                    for (const key of include) {
                        if (changes[key]) {
                            filteredChanges[key] = changes[key];
                        }
                    }
                }
                // Eğer değişiklik yoksa ve CREATE değilse log'lama
                if (Object.keys(filteredChanges).length === 0 && action !== 'CREATE') {
                    return result;
                }
                // Audit log oluştur
                await auditService.createAuditLog(userId, entityType, action, sensitive ? { changes: '[SENSITIVE DATA]' } : filteredChanges, {
                    ipAddress,
                    userAgent,
                    correlationId,
                    customFields: {
                        entityId,
                        method: propertyKey,
                        duration: Date.now() - startTime,
                        ...customFields,
                    },
                });
                return result;
            }
            catch (error) {
                // Başarısız işlemi log'la
                if (auditService) {
                    await auditService.createAuditLog('system', target.constructor.name, 'UPDATE', { error: error.message }, {
                        correlationId: `error_${Date.now()}`,
                        customFields: { method: propertyKey },
                    });
                }
                throw error;
            }
        };
        return descriptor;
    };
}
//# sourceMappingURL=audited.decorator.js.map