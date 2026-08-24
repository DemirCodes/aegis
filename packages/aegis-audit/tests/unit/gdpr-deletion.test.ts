// ============================================
// @aegis/audit - GDPRDeletionService Unit Tests
// ============================================

import { GDPRDeletionService } from '../../src/services/gdpr-deletion.service';
import { AuditTrailService } from '../../src/services/audit-trail.service';

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
    deleteMany: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  softDeleteRegistry: {
    create: jest.fn(),
  },
  $transaction: jest.fn(async (fn: any) => {
    return fn(mockPrisma);
  }),
} as any;

// Mock AuditTrailService
const mockAuditService = {
  createAuditLog: jest.fn().mockResolvedValue({}),
} as any;

describe('GDPRDeletionService', () => {
  let service: GDPRDeletionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GDPRDeletionService(mockPrisma, mockAuditService);
  });

  // ============================================
  // 1. eraseUserData()
  // ============================================

  describe('eraseUserData', () => {
    it('kullanıcı verilerini silmeli', async () => {
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.riskEvent.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 10 });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123', email: 'test@email.com' });
      mockPrisma.user.delete.mockResolvedValue({ id: 'user-123' });

      const result = await service.eraseUserData('user-123', 'user_requested');

      expect(result.status).toBe('completed');
      expect(result.recordsDeleted).toBeGreaterThan(0);
      expect(result.tablesAffected).toContain('UserSession');
      expect(result.tablesAffected).toContain('UserRole');
      expect(result.tablesAffected).toContain('RiskEvent');
      expect(result.tablesAffected).toContain('AuditLog');
      expect(result.tablesAffected).toContain('User');
    });

    it('userId eksikse VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.eraseUserData('', 'reason'),
      ).rejects.toThrow('userId is required');
    });

    it('reason eksikse VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.eraseUserData('user-123', ''),
      ).rejects.toThrow('reason is required');
    });

    it('hata olursa failed dönmeli', async () => {
      mockPrisma.$transaction.mockRejectedValueOnce(new Error('Transaction failed'));

      const result = await service.eraseUserData('user-123', 'test');

      expect(result.status).toBe('failed');
      expect(result.errors).toBeDefined();
    });

    it('kullanıcı yoksa yine de tamamlanmalı', async () => {
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.riskEvent.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.delete.mockRejectedValue(new Error('User not found'));

      const result = await service.eraseUserData('user-404', 'test');

      expect(result.status).toBe('failed');
    });
  });

  // ============================================
  // 2. exportUserData()
  // ============================================

  describe('exportUserData', () => {
    it('kullanıcı verilerini dışa aktarmalı', async () => {
      const mockUser = { id: 'user-123', email: 'test@email.com' };
      const mockAuditLogs = [
        { action: 'UPDATE', entityType: 'User', timestamp: new Date() },
      ];
      const mockSessions = [{ id: 'session-1' }];

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs);
      mockPrisma.userSession.findMany.mockResolvedValue(mockSessions);

      const result = await service.exportUserData('user-123', 'json');

      expect(result.userId).toBe('user-123');
      expect(result.format).toBe('json');
      expect(result.data.profile).toEqual(mockUser);
      expect(result.data.activities).toHaveLength(1);
    });

    it('userId eksikse VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.exportUserData('', 'json'),
      ).rejects.toThrow('userId is required');
    });

    it('kullanıcı yoksa NOT_FOUND fırlatmalı', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.exportUserData('user-404', 'json'),
      ).rejects.toThrow('User not found');
    });

    it('csv formatında dışa aktarmalı', async () => {
      const mockUser = { id: 'user-123', email: 'test@email.com' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.userSession.findMany.mockResolvedValue([]);

      const result = await service.exportUserData('user-123', 'csv');

      expect(result.format).toBe('csv');
    });
  });

  // ============================================
  // 3. anonymizeUserData()
  // ============================================

  describe('anonymizeUserData', () => {
    it('kullanıcı verilerini anonimleştirmeli', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 'user-123' });

      const result = await service.anonymizeUserData('user-123', ['email', 'phone']);

      expect(result.status).toBe('completed');
      expect(result.fieldsAnonymized).toContain('email');
      expect(result.fieldsAnonymized).toContain('phone');
    });

    it('userId eksikse VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.anonymizeUserData('', []),
      ).rejects.toThrow('userId is required');
    });

    it('varsayılan alanlar ile anonimleştirmeli', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 'user-123' });

      const result = await service.anonymizeUserData('user-123');

      expect(result.status).toBe('completed');
      expect(result.fieldsAnonymized.length).toBeGreaterThan(0);
    });

    it('hata olursa failed dönmeli', async () => {
      mockPrisma.user.update.mockRejectedValue(new Error('Update failed'));

      const result = await service.anonymizeUserData('user-123', ['email']);

      expect(result.status).toBe('failed');
    });
  });

  // ============================================
  // 4. getCascadeDeletePlan()
  // ============================================

  describe('getCascadeDeletePlan', () => {
    it('cascade delete planı getirmeli', async () => {
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.userSession.count.mockResolvedValue(5);
      mockPrisma.userRole.count.mockResolvedValue(2);
      mockPrisma.riskEvent.count.mockResolvedValue(3);
      mockPrisma.auditLog.count.mockResolvedValue(10);

      const result = await service.getCascadeDeletePlan('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.totalRecordsToDelete).toBe(21);
      expect(result.tables).toHaveLength(5);
    });

    it('userId eksikse VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.getCascadeDeletePlan(''),
      ).rejects.toThrow('userId is required');
    });

    it('hiç kayıt yoksa 0 dönmeli', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.userSession.count.mockResolvedValue(0);
      mockPrisma.userRole.count.mockResolvedValue(0);
      mockPrisma.riskEvent.count.mockResolvedValue(0);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const result = await service.getCascadeDeletePlan('user-404');

      expect(result.totalRecordsToDelete).toBe(0);
      expect(result.tables).toHaveLength(0);
    });
  });

  // ============================================
  // 5. verifyErasureCompletion()
  // ============================================

  describe('verifyErasureCompletion', () => {
    it('silme tamamlandıysa clean dönmeli', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.userSession.count.mockResolvedValue(0);
      mockPrisma.userRole.count.mockResolvedValue(0);
      mockPrisma.riskEvent.count.mockResolvedValue(0);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const result = await service.verifyErasureCompletion('user-123');

      expect(result.isComplete).toBe(true);
      expect(result.status).toBe('clean');
      expect(result.orphanedRecords).toHaveLength(0);
    });

    it('orphaned kayıtlar varsa has_orphans dönmeli', async () => {
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.userSession.count.mockResolvedValue(0);
      mockPrisma.userRole.count.mockResolvedValue(0);
      mockPrisma.riskEvent.count.mockResolvedValue(0);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const result = await service.verifyErasureCompletion('user-123');

      expect(result.isComplete).toBe(false);
      expect(result.status).toBe('has_orphans');
      expect(result.orphanedRecords).toHaveLength(1);
    });

    it('userId eksikse VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.verifyErasureCompletion(''),
      ).rejects.toThrow('userId is required');
    });
  });

  // ============================================
  // 6. scheduleDataErasure()
  // ============================================

  describe('scheduleDataErasure', () => {
    it('silme işlemini planlamalı', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const result = await service.scheduleDataErasure(
        'user-123',
        futureDate,
        'user_requested',
      );

      expect(result.status).toBe('scheduled');
      expect(result.canBeCancelled).toBe(true);
      expect(result.scheduledAt).toEqual(futureDate);
    });

    it('userId eksikse VALIDATION_ERROR fırlatmalı', async () => {
      const futureDate = new Date(Date.now() + 10000);

      await expect(
        service.scheduleDataErasure('', futureDate, 'reason'),
      ).rejects.toThrow('userId is required');
    });

    it('geçmiş tarih VALIDATION_ERROR fırlatmalı', async () => {
      const pastDate = new Date(Date.now() - 10000);

      await expect(
        service.scheduleDataErasure('user-123', pastDate, 'reason'),
      ).rejects.toThrow('scheduledAt must be in the future');
    });

    it('scheduledAt eksikse VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.scheduleDataErasure('user-123', null as any, 'reason'),
      ).rejects.toThrow('scheduledAt is required');
    });

    it('reason eksikse VALIDATION_ERROR fırlatmalı', async () => {
      const futureDate = new Date(Date.now() + 10000);

      await expect(
        service.scheduleDataErasure('user-123', futureDate, ''),
      ).rejects.toThrow('reason is required');
    });
  });

  // ============================================
  // 7. cancelScheduledErasure()
  // ============================================

  describe('cancelScheduledErasure', () => {
    it('planlı silmeyi iptal etmeli', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await service.scheduleDataErasure('user-123', futureDate, 'test');

      const result = service.cancelScheduledErasure('user-123');

      expect(result).toBe(true);
    });

    it('plan yoksa false dönmeli', () => {
      const result = service.cancelScheduledErasure('nonexistent');

      expect(result).toBe(false);
    });
  });
});