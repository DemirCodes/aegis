import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
/**
 * GDPR servisini initialize et
 */
export declare function initializeGDPREngine(prisma: PrismaClient): void;
/**
 * GDPR veri silme talebini işleyen middleware
 */
export declare function gdprErasureHandler(req: Request, res: Response, _next: NextFunction): Promise<void>;
/**
 * GDPR veri dışa aktarma talebini işleyen middleware
 */
export declare function gdprExportHandler(req: Request, res: Response, _next: NextFunction): Promise<void>;
//# sourceMappingURL=gdpr-engine.d.ts.map