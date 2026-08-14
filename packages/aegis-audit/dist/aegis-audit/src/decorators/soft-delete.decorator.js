"use strict";
// ============================================
// @aegis/audit - @SoftDelete Decorator
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSoftDelete = initializeSoftDelete;
exports.SoftDelete = SoftDelete;
let prismaClient = null;
let auditService = null;
/**
 * Soft delete servislerini initialize et
 */
function initializeSoftDelete(prisma, audit) {
    prismaClient = prisma;
    if (audit) {
        auditService = audit;
    }
}
/**
 * Entity'yi soft delete yapan decorator
 * Silmek yerine deletedAt timestamp'ini set eder
 * Aynı zamanda audit trail'e kaydeder
 */
function SoftDelete() {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            if (!prismaClient) {
                throw new Error('PrismaClient not initialized. Call initializeSoftDelete() first.');
            }
            const entityId = args[0];
            const entityType = target.constructor.name.replace('Service', '').toLowerCase();
            if (!entityId) {
                throw new Error('Entity ID is required for soft delete');
            }
            try {
                // Önce entity'nin var olduğunu kontrol et
                const existing = await prismaClient[entityType].findUnique({
                    where: { id: entityId },
                });
                if (!existing) {
                    throw new Error(`${entityType} with id ${entityId} not found`);
                }
                // Zaten silinmiş mi kontrol et
                if (existing.deletedAt) {
                    throw new Error(`${entityType} with id ${entityId} is already deleted`);
                }
                // Soft delete: deletedAt'i güncelle
                const result = await prismaClient[entityType].update({
                    where: { id: entityId },
                    data: { deletedAt: new Date() },
                });
                // Audit trail'e kaydet
                if (auditService) {
                    const userId = args[1]?.userId || 'system';
                    await auditService.createAuditLog(userId, entityType, 'DELETE', { deletedAt: new Date().toISOString(), previousData: existing }, { customFields: { entityId, method: 'softDelete' } });
                }
                return result;
            }
            catch (error) {
                // Orijinal metodu çağırmayı dene (failover)
                if (error.message.includes('not initialized')) {
                    throw error;
                }
                return originalMethod.apply(this, args);
            }
        };
        return descriptor;
    };
}
//# sourceMappingURL=soft-delete.decorator.js.map