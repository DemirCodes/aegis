"use strict";
// ============================================
// @aegis/audit - GDPR Engine Middleware
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGDPREngine = initializeGDPREngine;
exports.gdprErasureHandler = gdprErasureHandler;
exports.gdprExportHandler = gdprExportHandler;
const gdpr_deletion_service_1 = require("../services/gdpr-deletion.service");
const audit_trail_service_1 = require("../services/audit-trail.service");
let gdprService = null;
/**
 * GDPR servisini initialize et
 */
function initializeGDPREngine(prisma) {
    const auditService = new audit_trail_service_1.AuditTrailService(prisma);
    gdprService = new gdpr_deletion_service_1.GDPRDeletionService(prisma, auditService);
}
/**
 * GDPR veri silme talebini işleyen middleware
 */
async function gdprErasureHandler(req, res, _next) {
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
        }
        else {
            res.status(500).json({ success: false, error: result.errors });
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}
/**
 * GDPR veri dışa aktarma talebini işleyen middleware
 */
async function gdprExportHandler(req, res, _next) {
    if (!gdprService) {
        res.status(500).json({ error: 'GDPR service not initialized' });
        return;
    }
    const { userId } = req.params;
    const format = req.query.format || 'json';
    if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
    }
    try {
        const data = await gdprService.exportUserData(userId, format);
        res.json({ success: true, data });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}
//# sourceMappingURL=gdpr-engine.js.map