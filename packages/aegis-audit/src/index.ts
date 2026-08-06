// ============================================
// @aegis/audit - Main Entry Point
// ============================================

// Types
export * from './types/audit.types';
export * from './types/gdpr.types';

// Services
export { AuditTrailService } from './services/audit-trail.service';
export { GDPRDeletionService } from './services/gdpr-deletion.service';
export { AuditReportService } from './services/audit-report.service';

// Decorators
export { Audited, initializeAudit } from './decorators/audited.decorator';
export { SoftDelete, initializeSoftDelete } from './decorators/soft-delete.decorator';

// Middleware
export {
  auditMiddleware,
  excludeFromAudit,
  initializeAuditMiddleware,
} from './middleware/audit.middleware';
export {
  softDeleteFilter,
  initializeSoftDeleteMiddleware,
} from './middleware/soft-delete.middleware';
export {
  gdprErasureHandler,
  gdprExportHandler,
  initializeGDPREngine,
} from './middleware/gdpr-engine';

// Utils
export * from './utils/audit-helpers';