import { PrismaClient } from '@prisma/client';
import { AuditTrailService } from '../services/audit-trail.service';
/**
 * Soft delete servislerini initialize et
 */
export declare function initializeSoftDelete(prisma: PrismaClient, audit?: AuditTrailService): void;
/**
 * Entity'yi soft delete yapan decorator
 * Silmek yerine deletedAt timestamp'ini set eder
 * Aynı zamanda audit trail'e kaydeder
 */
export declare function SoftDelete(): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
//# sourceMappingURL=soft-delete.decorator.d.ts.map