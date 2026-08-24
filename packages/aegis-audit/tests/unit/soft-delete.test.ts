// ============================================
// @aegis/audit - SoftDeleteService Unit Tests
// ============================================

import { SoftDeleteService } from '../../src/services/soft-delete.service';
import { AuditTrailService } from '../../src/services/audit-trail.service';

// Mock PrismaClient
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  softDeleteRegistry: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(async (fn: any) => {
    return fn(mockPrisma);
  }),
} as any;

// Mock AuditTrailService
const mockAuditService = {
  createAuditLog: jest.fn().mockResolvedValue({}),
} as any;

describe('SoftDeleteService', () => {
  let service: SoftDeleteService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SoftDeleteService(mockPrisma, mockAuditService);
  });

  // ============================================
  // 1. softDelete()
  // ============================================

  describe('softDelete', () => {
    it('entity soft delete etmeli', async () => {
      const mockEntity = {
        id: 'user-123',
        name: 'Ali',
        email: 'ali@email.com',
        deletedAt: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockEntity);
      mockPrisma.user.update.mockResolvedValue({ ...mockEntity, deletedAt: new Date() });
      mockPrisma.softDeleteRegistry.create.mockResolvedValue({});

      const result = await service.softDelete('User', 'user-123', 'admin-1', 'test');

      expect(result.status).toBe('soft_deleted');
      expect(result.entityType).toBe('User');
      expect(result.entityId).toBe('user-123');
      expect(result.deletedBy).toBe('admin-1');
    });

    it('entity bulunamazsa not_found dönmeli', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.softDelete('User', 'user-404');

      expect(result.status).toBe('not_found');
    });

    it('zaten silinmişse soft_deleted dönmeli', async () => {
      const deletedEntity = {
        id: 'user-123',
        name: 'Ali',
        deletedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(deletedEntity);

      const result = await service.softDelete('User', 'user-123');

      expect(result.status).toBe('soft_deleted');
    });

    it('boş entityType VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.softDelete('', 'user-123'),
      ).rejects.toThrow('entityType is required');
    });

    it('boş entityId VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.softDelete('User', ''),
      ).rejects.toThrow('entityId is required');
    });
  });

  // ============================================
  // 2. restore()
  // ============================================

  describe('restore', () => {
    it('entity geri getirmeli', async () => {
      const registryRecord = {
        id: 'registry-1',
        entityType: 'User',
        entityId: 'user-123',
        originalData: JSON.stringify({ id: 'user-123', name: 'Ali' }),
        deletedBy: 'admin-1',
        deletionReason: 'test',
        isHardDeleted: false,
        hardDeletedAt: null,
        createdAt: new Date(),
      };

      mockPrisma.softDeleteRegistry.findUnique.mockResolvedValue(registryRecord);
      mockPrisma.user.update.mockResolvedValue({ id: 'user-123', deletedAt: null });
      mockPrisma.softDeleteRegistry.delete.mockResolvedValue({});

      const result = await service.restore('User', 'user-123');

      expect(result.status).toBe('restored');
      expect(result.entityType).toBe('User');
      expect(result.entityId).toBe('user-123');
    });

    it('registry kaydı yoksa not_found dönmeli', async () => {
      mockPrisma.softDeleteRegistry.findUnique.mockResolvedValue(null);

      const result = await service.restore('User', 'user-404');

      expect(result.status).toBe('not_found');
    });

    it('hard deleted ise not_found dönmeli', async () => {
      const hardDeletedRecord = {
        id: 'registry-1',
        entityType: 'User',
        entityId: 'user-123',
        isHardDeleted: true,
      };

      mockPrisma.softDeleteRegistry.findUnique.mockResolvedValue(hardDeletedRecord);

      const result = await service.restore('User', 'user-123');

      expect(result.status).toBe('not_found');
    });

    it('boş entityType VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.restore('', 'user-123'),
      ).rejects.toThrow('entityType is required');
    });

    it('boş entityId VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.restore('User', ''),
      ).rejects.toThrow('entityId is required');
    });
  });

  // ============================================
  // 3. hardDelete()
  // ============================================

  describe('hardDelete', () => {
    it('entity kalıcı silmeli', async () => {
      const registryRecord = {
        id: 'registry-1',
        entityType: 'User',
        entityId: 'user-123',
        isHardDeleted: false,
        hardDeletedAt: null,
      };

      mockPrisma.softDeleteRegistry.findUnique.mockResolvedValue(registryRecord);
      mockPrisma.user.delete.mockResolvedValue({ id: 'user-123' });
      mockPrisma.softDeleteRegistry.update.mockResolvedValue({});

      const result = await service.hardDelete('User', 'user-123');

      expect(result.status).toBe('hard_deleted');
      expect(result.entityType).toBe('User');
      expect(result.entityId).toBe('user-123');
    });

    it('registry kaydı yoksa not_soft_deleted dönmeli', async () => {
      mockPrisma.softDeleteRegistry.findUnique.mockResolvedValue(null);

      const result = await service.hardDelete('User', 'user-404');

      expect(result.status).toBe('not_soft_deleted');
    });

    it('zaten hard deleted ise hard_deleted dönmeli', async () => {
      const hardDeletedRecord = {
        id: 'registry-1',
        entityType: 'User',
        entityId: 'user-123',
        isHardDeleted: true,
        hardDeletedAt: new Date(),
      };

      mockPrisma.softDeleteRegistry.findUnique.mockResolvedValue(hardDeletedRecord);

      const result = await service.hardDelete('User', 'user-123');

      expect(result.status).toBe('hard_deleted');
    });

    it('boş entityType VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.hardDelete('', 'user-123'),
      ).rejects.toThrow('entityType is required');
    });

    it('boş entityId VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.hardDelete('User', ''),
      ).rejects.toThrow('entityId is required');
    });
  });

  // ============================================
  // 4. getSoftDeletedRecords()
  // ============================================

  describe('getSoftDeletedRecords', () => {
    it('silinmiş kayıtları getirmeli', async () => {
      const records = [
        {
          id: 'registry-1',
          entityType: 'User',
          entityId: 'user-123',
          originalData: JSON.stringify({ id: 'user-123', name: 'Ali' }),
          deletedBy: 'admin-1',
          deletionReason: 'test',
          isHardDeleted: false,
          hardDeletedAt: null,
          createdAt: new Date(),
        },
      ];

      mockPrisma.softDeleteRegistry.findMany.mockResolvedValue(records);

      const result = await service.getSoftDeletedRecords({ entityType: 'User' });

      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe('User');
      expect(result[0].entityId).toBe('user-123');
    });

    it('entityType filtresi ile getirmeli', async () => {
      mockPrisma.softDeleteRegistry.findMany.mockResolvedValue([]);

      await service.getSoftDeletedRecords({ entityType: 'Product' });

      expect(mockPrisma.softDeleteRegistry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'Product',
            isHardDeleted: false,
          }),
        }),
      );
    });

    it('includeHardDeleted true olduğunda tüm kayıtları getirmeli', async () => {
    mockPrisma.softDeleteRegistry.findMany.mockResolvedValue([]);

    await service.getSoftDeletedRecords({ includeHardDeleted: true });

    // where.isHardDeleted EKLENMEMELİ → where boş kalmalı
    expect(mockPrisma.softDeleteRegistry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
        where: {},  // ✅ Boş where
        }),
    );
    });

    it('limit ve offset uygulamalı', async () => {
      mockPrisma.softDeleteRegistry.findMany.mockResolvedValue([]);

      await service.getSoftDeletedRecords({ limit: 50, offset: 10 });

      expect(mockPrisma.softDeleteRegistry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 10,
        }),
      );
    });
  });

  // ============================================
  // 5. isSoftDeleted()
  // ============================================

  describe('isSoftDeleted', () => {
    it('soft deleted kaydı kontrol etmeli', async () => {
      const record = {
        id: 'registry-1',
        entityType: 'User',
        entityId: 'user-123',
        isHardDeleted: false,
        deletedBy: 'admin-1',
        createdAt: new Date(),
      };

      mockPrisma.softDeleteRegistry.findUnique.mockResolvedValue(record);

      const result = await service.isSoftDeleted('User', 'user-123');

      expect(result.isSoftDeleted).toBe(true);
      expect(result.isHardDeleted).toBe(false);
      expect(result.deletedBy).toBe('admin-1');
    });

    it('kayıt yoksa false dönmeli', async () => {
      mockPrisma.softDeleteRegistry.findUnique.mockResolvedValue(null);

      const result = await service.isSoftDeleted('User', 'user-404');

      expect(result.isSoftDeleted).toBe(false);
      expect(result.isHardDeleted).toBe(false);
      expect(result.deletedAt).toBeNull();
    });

    it('hard deleted kaydı kontrol etmeli', async () => {
      const record = {
        id: 'registry-1',
        entityType: 'User',
        entityId: 'user-123',
        isHardDeleted: true,
        deletedBy: 'admin-1',
        createdAt: new Date(),
      };

      mockPrisma.softDeleteRegistry.findUnique.mockResolvedValue(record);

      const result = await service.isSoftDeleted('User', 'user-123');

      expect(result.isSoftDeleted).toBe(true);
      expect(result.isHardDeleted).toBe(true);
    });

    it('boş entityType VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.isSoftDeleted('', 'user-123'),
      ).rejects.toThrow('entityType is required');
    });

    it('boş entityId VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.isSoftDeleted('User', ''),
      ).rejects.toThrow('entityId is required');
    });
  });
});