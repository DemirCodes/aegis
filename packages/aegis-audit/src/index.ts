// ============================================
// @aegis/audit - Main Entry Point
// ============================================

// Types
export * from './types/audit.types';
export * from './types/gdpr.types';
export * from './types/soft-delete.types';

// Services
export { AuditTrailService } from './services/audit-trail.service';
export { GDPRDeletionService } from './services/gdpr-deletion.service';
export { AuditReportService } from './services/audit-report.service';
export { SoftDeleteService } from './services/soft-delete.service';

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
  onlyDeletedFilter,
  getSoftDeletedRecordsHandler,
  initializeSoftDeleteMiddleware,
} from './middleware/soft-delete.middleware';

export {
  gdprErasureHandler,
  gdprExportHandler,
  initializeGDPREngine,
} from './middleware/gdpr-engine';


// Utils
export * from './utils/audit-helpers';