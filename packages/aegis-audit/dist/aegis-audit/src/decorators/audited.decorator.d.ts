import { PrismaClient } from '@prisma/client';
import type { AuditedOptions } from '../types/audit.types';
/**
 * Audit servisini initialize et
 */
export declare function initializeAudit(prisma: PrismaClient, sensitiveFields?: string[]): void;
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
export declare function Audited(options?: AuditedOptions): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
//# sourceMappingURL=audited.decorator.d.ts.map