// ============================================
// @aegis/audit - AuditTrailService Unit Tests
// ============================================

import { AuditTrailService } from '../src/services/audit-trail.service';
import {
  diffChanges,
  maskSensitiveData,
  generateChangesSummary,
  getClientIp,
  getUserAgent,
  generateAuditId,
} from '../src/utils/audit-helpers';

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

    it('metadata ile audit log oluşturmalı', async () => {
      const mockLog = {
        id: 'audit_meta_123',
        userId: 'user-1',
        entityType: 'User',
        entityId: 'user-456',
        action: 'UPDATE',
        changes: JSON.stringify({ name: { old: 'Ali', new: 'Veli' } }),
        changesSummary: 'name: "Ali" → "Veli"',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        correlationId: 'trace-123',
        metadata: JSON.stringify({ entityId: 'user-456', method: 'updateUser' }),
        status: 'completed',
        errorMessage: null,
        timestamp: new Date(),
      };

      mockPrisma.auditLog.create.mockResolvedValue(mockLog);

      const result = await service.createAuditLog(
        'user-1',
        'User',
        'UPDATE',
        { name: { old: 'Ali', new: 'Veli' } },
        {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          correlationId: 'trace-123',
          customFields: { entityId: 'user-456', method: 'updateUser' },
        },
      );

      expect(result.entityId).toBe('user-456');
      expect(result.metadata?.ipAddress).toBe('192.168.1.1');
      expect(result.metadata?.correlationId).toBe('trace-123');
    });

    it('sensitive veri ile audit log oluşturmalı', async () => {
      const mockLog = {
        id: 'audit_sensitive_123',
        userId: 'user-1',
        entityType: 'User',
        entityId: 'user-123',
        action: 'UPDATE',
        changes: JSON.stringify({ password: { old: '123', new: '456' } }),
        changesSummary: 'password: "[REDACTED]"',
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
        'UPDATE',
        { password: { old: '123', new: '456' } },
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('audit_sensitive_123');
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

    it('tarih filtresi ile log getirmeli', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await service.getAuditLogs({ startDate, endDate });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: { gte: startDate, lte: endDate },
          }),
        }),
      );
    });

    it('action filtresi ile log getirmeli', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLogs({ action: 'DELETE' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: 'DELETE' }),
        }),
      );
    });

    it('entityType filtresi ile log getirmeli', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLogs({ entityType: 'Product' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entityType: 'Product' }),
        }),
      );
    });

    it('entityId filtresi ile log getirmeli', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLogs({ entityId: 'prod-123' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entityId: 'prod-123' }),
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
          where: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      );
    });

    it('boş query VALIDATION_ERROR fırlatmalı', async () => {
      await expect(service.searchAuditLogs('')).rejects.toThrow('Search query is required');
    });

    it('filtreler ile arama yapmalı', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.searchAuditLogs('user@email.com', {
        entityType: 'User',
        action: 'UPDATE',
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'User',
            action: 'UPDATE',
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('200 karakterden uzun query kısaltılmalı', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const longQuery = 'a'.repeat(300);
      await service.searchAuditLogs(longQuery);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      );
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
        expect.objectContaining({ take: 100 }),
      );
    });

    it('entityFilters ile aktivite getirmeli', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.getUserActivityHistory('user-1', {
        entityFilters: ['User', 'Product'],
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: { in: ['User', 'Product'] },
          }),
        }),
      );
    });

    it('includeFailures false olmalı', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.getUserActivityHistory('user-1', { includeFailures: false });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'completed' }),
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

    it('metadata içeren toplu log yazmalı', async () => {
      mockPrisma.auditLog.createMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkCreateAuditLogs([
        {
          userId: 'u1',
          entityType: 'User',
          action: 'CREATE',
          changes: { name: { old: null, new: 'Ali' } },
          metadata: { ipAddress: '192.168.1.1' },
        },
        {
          userId: 'u2',
          entityType: 'Product',
          action: 'UPDATE',
          changes: { price: { old: 100, new: 150 } },
          metadata: { correlationId: 'trace-456' },
        },
      ]);

      expect(result).toBe(2);
      expect(mockPrisma.auditLog.createMany).toHaveBeenCalledTimes(1);
    });

    it('1000 üzeri log VALIDATION_ERROR fırlatmalı', async () => {
      const tooManyLogs = Array.from({ length: 1001 }, (_, i) => ({
        userId: `user-${i}`,
        entityType: 'User',
        action: 'CREATE' as const,
        changes: {},
      }));

      await expect(service.bulkCreateAuditLogs(tooManyLogs)).rejects.toThrow(
        'Maximum 1000 logs',
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

    it('CSV formatında export etmeli', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const result = await service.exportAuditTrail({}, 'csv');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toContain('id,userId,entityType');
    });

    it('PDF formatında export etmeli', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const result = await service.exportAuditTrail({}, 'pdf');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('CSV escape - virgül içeren değerler', async () => {
      const mockLog = {
        id: 'audit,1',
        userId: 'user,test',
        entityType: 'User',
        entityId: 'user-123',
        action: 'UPDATE',
        changes: JSON.stringify({ name: { old: 'Ali, Veli', new: 'Mehmet' } }),
        changesSummary: 'name: "Ali, Veli" → "Mehmet"',
        ipAddress: null,
        userAgent: null,
        correlationId: null,
        metadata: null,
        status: 'completed',
        errorMessage: null,
        timestamp: new Date(),
      };

      mockPrisma.auditLog.findMany.mockResolvedValue([mockLog]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await service.exportAuditTrail({}, 'csv');

      const csvString = result.toString();
      expect(csvString).toContain('"audit,1"');
      expect(csvString).toContain('"user,test"');
    });

    it('CSV escape - tırnak içeren değerler', async () => {
      const mockLog = {
        id: 'audit"test',
        userId: 'user"test',
        entityType: 'User',
        entityId: 'user-123',
        action: 'UPDATE',
        changes: JSON.stringify({ name: { old: 'Ali "Veli"', new: 'Mehmet' } }),
        changesSummary: 'name: "Ali ""Veli""" → "Mehmet"',
        ipAddress: null,
        userAgent: null,
        correlationId: null,
        metadata: null,
        status: 'completed',
        errorMessage: null,
        timestamp: new Date(),
      };

      mockPrisma.auditLog.findMany.mockResolvedValue([mockLog]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await service.exportAuditTrail({}, 'csv');

      const csvString = result.toString();
      expect(csvString).toContain('"audit""test"');
      expect(csvString).toContain('"user""test"');
    });

    it('CSV export - veri ile', async () => {
      const mockLog = {
        id: 'audit_csv_1',
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

      mockPrisma.auditLog.findMany.mockResolvedValue([mockLog]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await service.exportAuditTrail({}, 'csv');

      expect(result.toString()).toContain('audit_csv_1');
      expect(result.toString()).toContain('CREATE');
    });

    it('PDF export - veri ile', async () => {
      const mockLog = {
        id: 'audit_pdf_1',
        userId: 'user-1',
        entityType: 'User',
        entityId: 'user-123',
        action: 'UPDATE',
        changes: JSON.stringify({ name: { old: 'Ali', new: 'Veli' } }),
        changesSummary: 'name: "Ali" → "Veli"',
        ipAddress: null,
        userAgent: null,
        correlationId: null,
        metadata: null,
        status: 'completed',
        errorMessage: null,
        timestamp: new Date(),
      };

      mockPrisma.auditLog.findMany.mockResolvedValue([mockLog]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await service.exportAuditTrail({}, 'pdf');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(100);
    });

    it('PDF export - birden fazla kayıt', async () => {
      const mockLogs = [
        {
          id: 'audit_pdf_1',
          userId: 'user-1',
          entityType: 'User',
          entityId: 'user-1',
          action: 'CREATE',
          changes: JSON.stringify({}),
          changesSummary: '',
          ipAddress: null,
          userAgent: null,
          correlationId: null,
          metadata: null,
          status: 'completed',
          errorMessage: null,
          timestamp: new Date(),
        },
        {
          id: 'audit_pdf_2',
          userId: 'user-2',
          entityType: 'Product',
          entityId: 'prod-1',
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
        },
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.auditLog.count.mockResolvedValue(2);

      const result = await service.exportAuditTrail({}, 'pdf');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(200);
    });
  });
});

// ============================================
// audit-helpers.ts Testleri
// ============================================

describe('audit-helpers', () => {
  describe('diffChanges', () => {
    it('basit değişiklikleri tespit etmeli', () => {
      const oldData = { name: 'Ali', age: 25 };
      const newData = { name: 'Ali', age: 26 };

      const result = diffChanges(oldData, newData);

      expect(result).toEqual({
        age: { old: 25, new: 26 },
      });
    });

    it('aynı değerler için boş obje dönmeli', () => {
      const oldData = { name: 'Ali', age: 25 };
      const newData = { name: 'Ali', age: 25 };

      const result = diffChanges(oldData, newData);

      expect(result).toEqual({});
    });

    it('exclude alanları hariç tutmalı', () => {
      const oldData = { name: 'Ali', password: 'secret', email: 'a@a.com' };
      const newData = { name: 'Veli', password: 'secret', email: 'b@b.com' };

      const result = diffChanges(oldData, newData, ['password']);

      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
    });

    it('null ve undefined değerleri karşılaştırmalı', () => {
      const oldData = { name: 'Ali', bio: null, phone: undefined };
      const newData = { name: 'Ali', bio: 'Merhaba', phone: '555' };

      const result = diffChanges(oldData, newData);

      expect(result).toHaveProperty('bio');
      expect(result.bio.old).toBeNull();
      expect(result.bio.new).toBe('Merhaba');
      expect(result).toHaveProperty('phone');
    });

    it('Date objelerini doğru karşılaştırmalı', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');
      const oldData = { createdAt: date1 };
      const newData = { createdAt: date2 };

      const result = diffChanges(oldData, newData);

      expect(result).toHaveProperty('createdAt');
    });

    it('iç içe objeleri karşılaştırmalı', () => {
      const oldData = { profile: { name: 'Ali', age: 25 } };
      const newData = { profile: { name: 'Ali', age: 30 } };

      const result = diffChanges(oldData, newData);

      expect(result).toHaveProperty('profile');
      expect(result.profile.old).toEqual({ name: 'Ali', age: 25 });
      expect(result.profile.new).toEqual({ name: 'Ali', age: 30 });
    });

    it('Array değerlerini karşılaştırmalı', () => {
      const oldData = { tags: ['a', 'b'] };
      const newData = { tags: ['a', 'c'] };

      const result = diffChanges(oldData, newData);

      expect(result).toHaveProperty('tags');
    });
  });

  describe('maskSensitiveData', () => {
    it('varsayılan hassas alanları maskelemeli', () => {
      const data = {
        name: 'Ali',
        password: 'secret123',
        creditCard: '4111111111111111',
      };

      const result = maskSensitiveData(data);

      expect(result.password).toBe('[REDACTED]');
      expect(result.creditCard).toBe('[REDACTED]');
      expect(result.name).toBe('Ali');
    });

    it('özel hassas alanları maskelemeli', () => {
      const data = {
        email: 'ali@email.com',
        phone: '5551234567',
      };

      const result = maskSensitiveData(data, ['phone']);

      expect(result.phone).toBe('[REDACTED]');
      expect(result.email).toBe('ali@email.com');
    });

    it('case-insensitive maskeleme yapmalı', () => {
      const data = {
        Password: 'secret',
        CREDITCARD: '4111111111111111',
        name: 'Ali',
      };

      const result = maskSensitiveData(data);

      expect(result.Password).toBe('[REDACTED]');
      expect(result.CREDITCARD).toBe('[REDACTED]');
      expect(result.name).toBe('Ali');
    });

    it('iç içe objelerde maskeleme yapmalı', () => {
      const data = {
        profile: {
          name: 'Ali',
          token: 'abc123',
        },
      };

      const result = maskSensitiveData(data);

      expect(result.profile.token).toBe('[REDACTED]');
      expect(result.profile.name).toBe('Ali');
    });

    it('Date objelerini maskelememeli', () => {
      const date = new Date();
      const data = { createdAt: date };

      const result = maskSensitiveData(data);

      expect(result.createdAt).toBe(date);
    });

    it('Array değerlerini maskelememeli', () => {
      const data = { tags: ['a', 'b', 'c'] };

      const result = maskSensitiveData(data);

      expect(result.tags).toEqual(['a', 'b', 'c']);
    });
  });

  describe('generateChangesSummary', () => {
    it('değişiklik özetini oluşturmalı', () => {
      const changes = {
        email: { old: 'a@a.com', new: 'b@b.com' },
      };

      const result = generateChangesSummary(changes);

      expect(result).toBe('email: "a@a.com" → "b@b.com"');
    });

    it('birden fazla değişikliği özetlemeli', () => {
      const changes = {
        name: { old: 'Ali', new: 'Veli' },
        age: { old: 25, new: 30 },
      };

      const result = generateChangesSummary(changes);

      expect(result).toContain('name: "Ali" → "Veli"');
      expect(result).toContain('age: "25" → "30"');
    });

    it('uzun değerleri kısaltmalı', () => {
      const longText = 'a'.repeat(100);
      const changes = {
        bio: { old: longText, new: 'kısa' },
      };

      const result = generateChangesSummary(changes, 20);

      expect(result).toContain('...');
    });

    it('null değerleri doğru göstermeli', () => {
      const changes = {
        bio: { old: null, new: 'Merhaba' },
      };

      const result = generateChangesSummary(changes);

      expect(result).toContain('bio: "null" → "Merhaba"');
    });

    it('boş changes için boş string dönmeli', () => {
      const result = generateChangesSummary({});

      expect(result).toBe('');
    });
  });

  describe('getClientIp', () => {
    it('X-Forwarded-For header varsa ilk IP\'yi dönmeli', () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.5, 10.0.0.1',
        },
      };

      const result = getClientIp(req);

      expect(result).toBe('203.0.113.5');
    });

    it('Cloudflare IP varsa onu dönmeli', () => {
      const req = {
        headers: {
          'cf-connecting-ip': '198.51.100.7',
        },
      };

      const result = getClientIp(req);

      expect(result).toBe('198.51.100.7');
    });

    it('Express IP varsa onu dönmeli', () => {
      const req = {
        ip: '192.168.1.1',
      };

      const result = getClientIp(req);

      expect(result).toBe('192.168.1.1');
    });

    it('socket IP varsa onu dönmeli', () => {
      const req = {
        socket: { remoteAddress: '10.0.0.1' },
      };

      const result = getClientIp(req);

      expect(result).toBe('10.0.0.1');
    });

    it('hiçbir IP yoksa unknown dönmeli', () => {
      const req = {};

      const result = getClientIp(req);

      expect(result).toBe('unknown');
    });

    it('req null ise unknown dönmeli', () => {
      const result = getClientIp(null);

      expect(result).toBe('unknown');
    });
  });

  describe('getUserAgent', () => {
    it('User-Agent header varsa onu dönmeli', () => {
      const req = {
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      };

      const result = getUserAgent(req);

      expect(result).toBe('Mozilla/5.0');
    });

    it('User-Agent yoksa unknown dönmeli', () => {
      const req = {};

      const result = getUserAgent(req);

      expect(result).toBe('unknown');
    });

    it('req null ise unknown dönmeli', () => {
      const result = getUserAgent(null);

      expect(result).toBe('unknown');
    });
  });

  describe('generateAuditId', () => {
    it('audit_ prefix ile başlamalı', () => {
      const result = generateAuditId();

      expect(result.startsWith('audit_')).toBe(true);
    });

    it('16 karakter uzunluğunda olmalı', () => {
      const result = generateAuditId();

      expect(result.length).toBe(6 + 16);
    });

    it('her çağrıda benzersiz olmalı', () => {
      const id1 = generateAuditId();
      const id2 = generateAuditId();

      expect(id1).not.toBe(id2);
    });
  });
});