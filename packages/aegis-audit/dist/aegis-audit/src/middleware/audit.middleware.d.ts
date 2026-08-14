import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
/**
 * Audit middleware'i initialize et
 */
export declare function initializeAuditMiddleware(prisma: PrismaClient): void;
/**
 * Tüm API isteklerini audit trail'e kaydeden middleware
 * Hassas endpoint'leri (login, register) log'lamaz
 */
export declare function auditMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * Belirli endpoint'leri audit'ten hariç tutan middleware
 */
export declare function excludeFromAudit(paths: string[]): (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=audit.middleware.d.ts.map