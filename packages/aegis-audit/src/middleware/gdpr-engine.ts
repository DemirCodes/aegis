// ============================================
// @aegis/audit - GDPR Engine Middleware
// ============================================

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { GDPRDeletionService } from '../services/gdpr-deletion.service';
import { AuditTrailService } from '../services/audit-trail.service';

let gdprService: GDPRDeletionService | null = null;

/**
 * GDPR servisini initialize et
 */
export function initializeGDPREngine(prisma: PrismaClient) {
  const auditService = new AuditTrailService(prisma);
  gdprService = new GDPRDeletionService(prisma, auditService);
}

/**
 * GDPR veri silme talebini işleyen middleware
 */
export async function gdprErasureHandler(req: Request, res: Response, _next: NextFunction): Promise<void> {
  if (!gdprService) {
    res.status(500).json({ error: 'GDPR service not initialized' });
    return;
  }

  const { userId, reason } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    const result = await gdprService.eraseUserData(userId, reason || 'user_requested');
    
    if (result.status === 'completed') {
      res.json({ success: true, data: result });
    } else {
      res.status(500).json({ success: false, error: result.errors });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

/**
 * GDPR veri dışa aktarma talebini işleyen middleware
 */
export async function gdprExportHandler(req: Request, res: Response, _next: NextFunction): Promise<void> {
  if (!gdprService) {
    res.status(500).json({ error: 'GDPR service not initialized' });
    return;
  }

  const { userId } = req.params;
  const format = (req.query.format as 'json' | 'csv') || 'json';

  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    const data = await gdprService.exportUserData(userId, format);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}