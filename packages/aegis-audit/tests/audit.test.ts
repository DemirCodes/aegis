// ============================================
// @aegis/audit - AuditTrailService Unit Tests
// ============================================

import { AuditTrailService } from '../src/services/audit-trail.service';

// Mock PrismaClient
const mockPrisma = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    delete: jest.fn(),
  },
} as any;

const service = new AuditTrailService(mockPrisma);
describe('AuditTrailService', () => {
  let service: AuditTrailService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditTrailService(mockPrisma);
  });

  // ============================================
  // 1. createAuditLog()
  // ============================================

  describe('createAuditLog', () => {
    it('başarılı audit log oluşturmalı', async () => {
      const mockLog = {
        id: 'audit_123',
        userId: 'user-1',
        entityType: 'User',
        entityId: 'user-123',
        action: 'CREATE',
        changes: JSON.stringify({ name: { old: null, new: 'Ali' } }),
        changesSummary: 'name: "null" → "Ali"',
        ipAddress: null,
        userAgent: null,
        correlationId: null,
        metadata: null,
        status: 'completed',
        errorMessage: null,
        timestamp: new Date(),
      };

      mockPrisma.auditLog.create.mockResolvedValue(mockLog);

      const result = await service.createAuditLog(
        'user-1',
        'User',
        'CREATE',
        { name: { old: null, new: 'Ali' } },
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('audit_123');
      expect(result.status).toBe('completed');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
    });

    it('userId eksikse VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.createAuditLog('', 'User', 'CREATE', {}),
      ).rejects.toThrow('userId is required');
    });

    it('entityType eksikse VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.createAuditLog('user-1', '', 'CREATE', {}),
      ).rejects.toThrow('entityType is required');
    });

    it('action eksikse VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.createAuditLog('user-1', 'User', '' as any, {}),
      ).rejects.toThrow('action is required');
    });

    it('kayıt başarısız olursa failed olarak kaydetmeli', async () => {
      const failedLog = {
        id: 'audit_failed_123',
        userId: 'user-1',
        entityType: 'User',
        entityId: 'unknown',
        action: 'CREATE',
        changes: JSON.stringify({}),
        changesSummary: '',
        ipAddress: null,
        userAgent: null,
        correlationId: null,
        metadata: null,
        status: 'failed',
        errorMessage: 'DB error',
        timestamp: new Date(),
      };

      mockPrisma.auditLog.create
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce(failedLog);

      const result = await service.createAuditLog('user-1', 'User', 'CREATE', {});

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('DB error');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================
  // 2. getAuditLogs()
  // ============================================

  describe('getAuditLogs', () => {
    it('filtre ve sayfalama ile log getirmeli', async () => {
      const mockLogs = [
        {
          id: 'audit_1',
          userId: 'user-1',
          entityType: 'User',
          entityId: 'user-123',
          action: 'UPDATE',
          changes: JSON.stringify({ email: { old: 'a@a.com', new: 'b@b.com' } }),
          changesSummary: 'email changed',
          ipAddress: null,
          userAgent: null,
          correlationId: null,
          metadata: null,
          status: 'completed',
          errorMessage: null,
          timestamp: new Date(),
        },
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await service.getAuditLogs(
        { userId: 'user-1' },
        { page: 1, pageSize: 20 },
      );

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.hasMore).toBe(false);
    });

    it('sort parametresi orderBy\'a bağlanmalı', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLogs({}, { sort: ['timestamp:asc'] });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ timestamp: 'asc' }],
        }),
      );
    });
  });

  // ============================================
  // 3. getAuditLogById()
  // ============================================

  describe('getAuditLogById', () => {
    it('ID ile log getirmeli', async () => {
      const mockLog = {
        id: 'audit_123',
        userId: 'user-1',
        entityType: 'User',
        entityId: 'user-123',
        action: 'UPDATE',
        changes: JSON.stringify({}),
        changesSummary: '',
        ipAddress: null,
        userAgent: null,
        correlationId: null,
        metadata: null,
        status: 'completed',
        errorMessage: null,
        timestamp: new Date(),
      };

      mockPrisma.auditLog.findUnique.mockResolvedValue(mockLog);

      const result = await service.getAuditLogById('audit_123');

      expect(result).toBeDefined();
      expect(result!.id).toBe('audit_123');
    });

    it('bulunamazsa null dönmeli', async () => {
      mockPrisma.auditLog.findUnique.mockResolvedValue(null);

      const result = await service.getAuditLogById('nonexistent');

      expect(result).toBeNull();
    });

    it('auditLogId eksikse VALIDATION_ERROR fırlatmalı', async () => {
      await expect(service.getAuditLogById('')).rejects.toThrow('auditLogId is required');
    });
  });

  // ============================================
  // 4. searchAuditLogs()
  // ============================================

  describe('searchAuditLogs', () => {
    it('query ile arama yapmalı', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.searchAuditLogs('user@email.com');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('boş query VALIDATION_ERROR fırlatmalı', async () => {
      await expect(service.searchAuditLogs('')).rejects.toThrow('Search query is required');
    });
  });

  // ============================================
  // 5. getUserActivityHistory()
  // ============================================

  describe('getUserActivityHistory', () => {
    it('kullanıcı aktivite geçmişini getirmeli', async () => {
      const mockLogs = [
        {
          timestamp: new Date(),
          action: 'UPDATE',
          entityType: 'User',
          entityId: 'user-123',
          changes: JSON.stringify({}),
          ipAddress: null,
        },
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getUserActivityHistory('user-1', { limit: 10 });

      expect(result).toHaveLength(1);
      expect(result[0].entity).toBe('User');
    });

    it('limit 100\'ü aşmamalı', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.getUserActivityHistory('user-1', { limit: 500 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });

  // ============================================
  // 6. getEntityHistory()
  // ============================================

  describe('getEntityHistory', () => {
    it('entity geçmişini getirmeli', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.getEntityHistory('Product', 'prod-123');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: 'Product', entityId: 'prod-123' },
        }),
      );
    });

    it('boş entityType VALIDATION_ERROR fırlatmalı', async () => {
      await expect(service.getEntityHistory('', 'prod-123')).rejects.toThrow(
        'entityType is required',
      );
    });

    it('boş entityId VALIDATION_ERROR fırlatmalı', async () => {
      await expect(service.getEntityHistory('Product', '')).rejects.toThrow(
        'entityId is required',
      );
    });
  });

  // ============================================
  // 7. retryFailedAuditLog()
  // ============================================

  describe('retryFailedAuditLog', () => {
    it('failed log\'u tekrar yazmalı', async () => {
      const failedLog = {
        id: 'audit_failed',
        userId: 'user-1',
        entityType: 'User',
        entityId: 'user-123',
        action: 'UPDATE',
        changes: JSON.stringify({}),
        changesSummary: '',
        ipAddress: null,
        userAgent: null,
        correlationId: null,
        metadata: null,
        status: 'failed',
        errorMessage: 'DB error',
        timestamp: new Date(),
      };

      mockPrisma.auditLog.findUnique.mockResolvedValue(failedLog);
      mockPrisma.auditLog.create.mockResolvedValue({ ...failedLog, id: 'audit_new', status: 'completed' });
      mockPrisma.auditLog.delete.mockResolvedValue({});

      const result = await service.retryFailedAuditLog('audit_failed');

      expect(result).toBe(true);
      expect(mockPrisma.auditLog.delete).toHaveBeenCalled();
    });

    it('log bulunamazsa false dönmeli', async () => {
      mockPrisma.auditLog.findUnique.mockResolvedValue(null);

      const result = await service.retryFailedAuditLog('nonexistent');

      expect(result).toBe(false);
    });

    it('zaten completed ise false dönmeli', async () => {
      mockPrisma.auditLog.findUnique.mockResolvedValue({
        id: 'audit_1',
        status: 'completed',
      });

      const result = await service.retryFailedAuditLog('audit_1');

      expect(result).toBe(false);
    });
  });

  // ============================================
  // 8. purgeOldAuditLogs()
  // ============================================

  describe('purgeOldAuditLogs', () => {
    it('eski logları silmeli', async () => {
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 50 });

      const result = await service.purgeOldAuditLogs(new Date('2024-01-01'));

      expect(result).toBe(50);
      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalled();
    });

    it('gelecek tarih VALIDATION_ERROR fırlatmalı', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      await expect(service.purgeOldAuditLogs(futureDate)).rejects.toThrow(
        'olderThan cannot be in the future',
      );
    });
  });

  // ============================================
  // 9. getAuditLogByCorrelationId()
  // ============================================

  describe('getAuditLogByCorrelationId', () => {
    it('correlationId ile log getirmeli', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.getAuditLogByCorrelationId('trace-123');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { correlationId: 'trace-123' },
        }),
      );
    });

    it('boş correlationId VALIDATION_ERROR fırlatmalı', async () => {
      await expect(service.getAuditLogByCorrelationId('')).rejects.toThrow(
        'correlationId is required',
      );
    });
  });

  // ============================================
  // 10. bulkCreateAuditLogs()
  // ============================================

  describe('bulkCreateAuditLogs', () => {
    it('toplu log yazmalı', async () => {
      mockPrisma.auditLog.createMany.mockResolvedValue({ count: 3 });

      const result = await service.bulkCreateAuditLogs([
        { userId: 'u1', entityType: 'User', action: 'CREATE', changes: {} },
        { userId: 'u2', entityType: 'Product', action: 'UPDATE', changes: {} },
        { userId: 'u3', entityType: 'Order', action: 'DELETE', changes: {} },
      ]);

      expect(result).toBe(3);
      expect(mockPrisma.auditLog.createMany).toHaveBeenCalledTimes(1);
    });

    it('boş array VALIDATION_ERROR fırlatmalı', async () => {
      await expect(service.bulkCreateAuditLogs([])).rejects.toThrow(
        'logs array is required',
      );
    });
  });

  // ============================================
  // 11. exportAuditTrail()
  // ============================================

  describe('exportAuditTrail', () => {
    it('JSON formatında export etmeli', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const result = await service.exportAuditTrail({}, 'json');

      expect(result).toBeInstanceOf(Buffer);
      expect(JSON.parse(result.toString())).toEqual([]);
    });

    it('geçersiz format VALIDATION_ERROR fırlatmalı', async () => {
      await expect(
        service.exportAuditTrail({}, 'xml' as any),
      ).rejects.toThrow('Unsupported format');
    });
  });
});