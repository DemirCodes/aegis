// ============================================
// @aegis/audit - GDPR Integration Tests
// GDPRDeletionService + AuditTrailService entegrasyonu
// ============================================

import { GDPRDeletionService } from '../src/services/gdpr-deletion.service';
import { AuditTrailService } from '../src/services/audit-trail.service';
import { SoftDeleteService } from '../src/services/soft-delete.service';

// Mock PrismaClient
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  userSession: {
    deleteMany: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  userRole: {
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  riskEvent: {
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  softDeleteRegistry: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(async (fn: any) => {
    return fn(mockPrisma);
  }),
} as any;

describe('GDPR Integration Tests', () => {
  let auditService: AuditTrailService;
  let gdprService: GDPRDeletionService;
  let softDeleteService: SoftDeleteService;

  beforeEach(() => {
    jest.clearAllMocks();
    auditService = new AuditTrailService(mockPrisma);
    gdprService = new GDPRDeletionService(mockPrisma, auditService);
    softDeleteService = new SoftDeleteService(mockPrisma, auditService);
  });

  // ============================================
  // 1. GDPR Silme + Audit Entegrasyonu
  // ============================================

  describe('GDPR Erasure + Audit Log', () => {
    it('silme işlemi audit log oluşturmalı', async () => {
      const mockAuditLog = {
        id: 'audit_gdpr_123',
        userId: 'user-123',
        entityType: 'User',
        entityId: 'user-123',
        action: 'DELETE',
        changes: JSON.stringify({ reason: 'user_requested' }),
        changesSummary: 'reason: "user_requested"',
        ipAddress: null,
        userAgent: null,
        correlationId: 'gdpr_erase_user-123',
        metadata: null,
        status: 'completed',
        errorMessage: null,
        timestamp: new Date(),
      };

      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.riskEvent.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 10 });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123', email: 'test@email.com' });
      mockPrisma.user.delete.mockResolvedValue({ id: 'user-123' });
      mockPrisma.auditLog.create.mockResolvedValue(mockAuditLog);

      const result = await gdprService.eraseUserData('user-123', 'user_requested');

      expect(result.status).toBe('completed');
      // Audit log oluşturuldu mu? (catch ile olduğu için en az 1 kez denendi)
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('audit log hatası GDPR silmeyi engellememeli', async () => {
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.riskEvent.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.delete.mockResolvedValue({});

      // Audit log hata fırlatıyor ama GDPR silme devam etmeli
      mockPrisma.auditLog.create.mockRejectedValue(new Error('Audit failed'));

      const result = await gdprService.eraseUserData('user-123', 'test');

      // Audit hatası olsa bile silme işlemi tamamlanmalı
      expect(result.status).toBe('completed');
    });
  });

  // ============================================
  // 2. Soft Delete + GDPR Silme Entegrasyonu
  // ============================================

  describe('Soft Delete + GDPR Entegrasyonu', () => {
    it('önce soft delete sonra GDPR hard delete', async () => {
      const mockEntity = {
        id: 'user-123',
        name: 'Ali',
        email: 'ali@email.com',
        deletedAt: null,
      };

      const registryRecord = {
        id: 'registry-1',
        entityType: 'User',
        entityId: 'user-123',
        originalData: JSON.stringify(mockEntity),
        deletedBy: 'admin-1',
        deletionReason: 'test',
        isHardDeleted: false,
        hardDeletedAt: null,
        createdAt: new Date(),
      };

      // 1. Soft delete yap
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockEntity);
      mockPrisma.user.update.mockResolvedValueOnce({ ...mockEntity, deletedAt: new Date() });
      mockPrisma.softDeleteRegistry.create.mockResolvedValueOnce({});

      const softDeleteResult = await softDeleteService.softDelete(
        'User',
        'user-123',
        'admin-1',
        'test',
      );

      expect(softDeleteResult.status).toBe('soft_deleted');

      // 2. Registry'de kayıt var
      mockPrisma.softDeleteRegistry.findUnique.mockResolvedValueOnce(registryRecord);
      mockPrisma.user.delete.mockResolvedValueOnce({});
      mockPrisma.softDeleteRegistry.update.mockResolvedValueOnce({});

      const hardDeleteResult = await softDeleteService.hardDelete('User', 'user-123');

      expect(hardDeleteResult.status).toBe('hard_deleted');
    });

    it('soft delete edilmiş kullanıcı GDPR ile silinebilmeli', async () => {
      const softDeletedUser = {
        id: 'user-123',
        email: 'ali@email.com',
        deletedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(softDeletedUser);
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.riskEvent.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.user.delete.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await gdprService.eraseUserData('user-123', 'gdpr_request');

      expect(result.status).toBe('completed');
      expect(result.tablesAffected).toContain('User');
    });
  });

  // ============================================
  // 3. GDPR Anonimleştirme + Audit Entegrasyonu
  // ============================================

  describe('GDPR Anonymization + Audit', () => {
    it('anonimleştirme audit log oluşturmalı', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 'user-123' });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await gdprService.anonymizeUserData('user-123', ['email', 'phone']);

      expect(result.status).toBe('completed');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('anonimleştirme hata olursa failed dönmeli ve audit log yazılmalı', async () => {
      mockPrisma.user.update.mockRejectedValue(new Error('Update failed'));
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await gdprService.anonymizeUserData('user-123', ['email']);

      expect(result.status).toBe('failed');
    });
  });

  // ============================================
  // 4. Tam GDPR Akışı (Schedule → Erase → Verify)
  // ============================================

  describe('Tam GDPR Akışı', () => {
    it('planla → sil → doğrula akışı çalışmalı', async () => {
      const futureDate = new Date(Date.now() + 1000); // 1 saniye sonra

      // 1. Planla
      const scheduled = await gdprService.scheduleDataErasure(
        'user-123',
        futureDate,
        'user_requested',
      );

      expect(scheduled.status).toBe('scheduled');
      expect(scheduled.canBeCancelled).toBe(true);

      // 2. İptal et
      const cancelled = gdprService.cancelScheduledErasure('user-123');
      expect(cancelled).toBe(true);

      // 3. Tekrar planla ve sil
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.riskEvent.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.delete.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const eraseResult = await gdprService.eraseUserData('user-123', 'final_delete');

      expect(eraseResult.status).toBe('completed');

      // 4. Doğrula
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.userSession.count.mockResolvedValue(0);
      mockPrisma.userRole.count.mockResolvedValue(0);
      mockPrisma.riskEvent.count.mockResolvedValue(0);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const verification = await gdprService.verifyErasureCompletion('user-123');

      expect(verification.isComplete).toBe(true);
      expect(verification.status).toBe('clean');
    });

    it('verifyErasureCompletion orphaned kayıtları tespit etmeli', async () => {
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.userSession.count.mockResolvedValue(3);
      mockPrisma.userRole.count.mockResolvedValue(0);
      mockPrisma.riskEvent.count.mockResolvedValue(0);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const verification = await gdprService.verifyErasureCompletion('user-123');

      expect(verification.isComplete).toBe(false);
      expect(verification.status).toBe('has_orphans');
      expect(verification.orphanedRecords).toHaveLength(2);
    });
  });

  // ============================================
  // 5. Cascade Delete Plan + Silme Entegrasyonu
  // ============================================

  describe('Cascade Plan + Erasure', () => {
    it('plan doğru kayıt sayısını göstermeli', async () => {
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.userSession.count.mockResolvedValue(5);
      mockPrisma.userRole.count.mockResolvedValue(2);
      mockPrisma.riskEvent.count.mockResolvedValue(3);
      mockPrisma.auditLog.count.mockResolvedValue(10);

      const plan = await gdprService.getCascadeDeletePlan('user-123');

      expect(plan.totalRecordsToDelete).toBe(21);
      expect(plan.tables).toHaveLength(5);
    });

    it('plan sonrası silme doğru sayıda kayıt silmeli', async () => {
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.userSession.count.mockResolvedValue(5);
      mockPrisma.userRole.count.mockResolvedValue(2);
      mockPrisma.riskEvent.count.mockResolvedValue(3);
      mockPrisma.auditLog.count.mockResolvedValue(10);

      const plan = await gdprService.getCascadeDeletePlan('user-123');
      expect(plan.totalRecordsToDelete).toBe(21);

      // Şimdi sil
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.riskEvent.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 10 });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123' });
      mockPrisma.user.delete.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await gdprService.eraseUserData('user-123', 'plan_based_delete');

      expect(result.recordsDeleted).toBe(21);
    });
  });
});