import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
/**
 * Soft delete middleware'ini initialize et
 */
export declare function initializeSoftDeleteMiddleware(prisma: PrismaClient): void;
/**
 * Soft-delete edilmiş kayıtları filtreleyen middleware
 * Response çıktısındaki deletedAt alanı olan kayıtları filtreler
 */
export declare function softDeleteFilter(req: Request, res: Response, next: NextFunction): void;
/**
 * Sadece soft-delete edilmiş kayıtları getiren middleware
 */
export declare function onlyDeletedFilter(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=soft-delete.middleware.d.ts.map