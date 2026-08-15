// ============================================
// @aegis/audit - Audit Report Service
// Anayasaya Uygun Güçlendirilmiş Raporlama Servisi
// + 4 Yeni Fonksiyon: getDailyActivity, getTopErrorMessages,
//   getUserActivityTimeline, getEntityChangeTrend
// ============================================

import { PrismaClient } from '@prisma/client';
import { logger, toJSON, AppError } from '@aegis/core';

// ============================================
// TİP TANIMLARI
// ============================================

/**
 * Dönem bazlı özet rapor
 * @example { period: { startDate, endDate }, totalActions: 1250, ... }
 */
interface SummaryReport {
  period: { startDate: Date; endDate: Date };
  totalActions: number;
  actionBreakdown: Record<string, number>;      // { CREATE: 400, UPDATE: 600, DELETE: 250 }
  entityBreakdown: Record<string, number>;       // { User: 800, Product: 450 }
  userBreakdown: Record<string, number>;         // { 'user-123': 150 }
  dailyActivity: Record<string, number>;         // { '2024-01-15': 1250 }
  generatedAt: Date;
}

/**
 * En aktif kullanıcı bilgisi
 * @example { userId: 'user-123', totalActions: 150 }
 */
interface ActiveUser {
  userId: string;
  totalActions: number;
}

/**
 * En çok değişen entity bilgisi
 * @example { entityType: 'Product', totalChanges: 450 }
 */
interface ChangedEntity {
  entityType: string;
  totalChanges: number;
}

/**
 * Başarısız audit log kaydı
 */
interface FailedAuditLogEntry {
  id: string;
  userId: string | null;       // Başarısız log'larda userId null olabilir
  entityType: string;
  action: string;
  errorMessage: string | null; // Hata mesajı
  timestamp: Date;
}

/**
 * Saatlik aktivite dağılımı
 * @example { date: '2024-01-15', hourlyActivity: { 0: 10, 1: 5, ..., 23: 20 } }
 */
interface HourlyActivity {
  date: string;
  hourlyActivity: Record<number, number>;
}

/**
 * Günlük aktivite trendi
 * @example { day: '2024-01-15', totalActions: 1250, createCount: 400, updateCount: 600, deleteCount: 250 }
 */
interface DailyActivity {
  day: string;
  totalActions: number;
  createCount: number;
  updateCount: number;
  deleteCount: number;
}

/**
 * Hata sıklığı bilgisi
 * @example { errorMessage: 'DB timeout', count: 45 }
 */
interface ErrorFrequency {
  errorMessage: string;
  count: number;
}

/**
 * Kullanıcı aktivite timeline'ı
 */
interface ActivityTimeline {
  userId: string;
  period: 'day' | 'week' | 'month';
  data: Array<{
    date: string;
    actionCount: number;
  }>;
}

/**
 * Entity değişim trendi
 */
interface ChangeTrend {
  entityType: string;
  entityId: string;
  totalChanges: number;
  lastChangedAt: Date | null;
  avgChangesPerDay: number;
}

// ============================================
// SERVİS
// ============================================

export class AuditReportService {
  private readonly MAX_LIMIT = 100;   // Tüm sorgularda tutarlı üst limit
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================
  // 1. generateSummaryReport()
  // ============================================

  /**
   * Belirli bir dönem için özet rapor oluşturur
   * Tüm aksiyon, entity, kullanıcı ve günlük dağılımları içerir
   * 
   * @param startDate - Rapor başlangıç tarihi
   * @param endDate - Rapor bitiş tarihi
   * @returns SummaryReport - Dönem bazlı özet
   * 
   * @example
   * const report = await service.generateSummaryReport(
   *   new Date('2024-01-01'),
   *   new Date('2024-01-31')
   * );
   * console.log(report.totalActions); // 1250
   */
  async generateSummaryReport(startDate: Date, endDate: Date): Promise<SummaryReport> {
    // Güçlendirilmiş validasyon
    if (!startDate || !endDate) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'startDate and endDate are required',
        statusCode: 400,
      });
    }
    if (startDate > endDate) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'startDate cannot be after endDate',
        statusCode: 400,
      });
    }

    logger.info('Generating summary report', { startDate, endDate });

    const logs = await this.prisma.auditLog.findMany({
      where: { timestamp: { gte: startDate, lte: endDate } },
      select: { action: true, entityType: true, userId: true, timestamp: true },
    });

    const totalActions = logs.length;
    const actionBreakdown: Record<string, number> = {};
    const entityBreakdown: Record<string, number> = {};
    const userBreakdown: Record<string, number> = {};
    const dailyActivity: Record<string, number> = {};

    for (const log of logs) {
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
      entityBreakdown[log.entityType] = (entityBreakdown[log.entityType] || 0) + 1;
      userBreakdown[log.userId || 'unknown'] = (userBreakdown[log.userId || 'unknown'] || 0) + 1;
      const day = log.timestamp.toISOString().split('T')[0];
      dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    }

    const report: SummaryReport = {
      period: { startDate, endDate },
      totalActions,
      actionBreakdown,
      entityBreakdown,
      userBreakdown,
      dailyActivity,
      generatedAt: new Date(),
    };

    logger.info('Summary report generated', { totalActions });
    return report;
  }

  // ============================================
  // 2. getMostActiveUsers()
  // ============================================

  /**
   * En aktif kullanıcıları getirir (aksiyon sayısına göre)
   * 
   * @param limit - Kaç kullanıcı getirilsin? (default: 10, max: 100)
   * @returns ActiveUser[] - Kullanıcı ve toplam aksiyon sayısı
   * 
   * @example
   * const users = await service.getMostActiveUsers(5);
   * // [{ userId: 'user-123', totalActions: 150 }, ...]
   */
  async getMostActiveUsers(limit: number = 10): Promise<ActiveUser[]> {
    const safeLimit = Math.min(this.MAX_LIMIT, Math.max(1, limit));

    const result = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: safeLimit,
    });

    return result.map((item: { userId: string | null; _count: { id: number } }) => ({
      userId: item.userId || 'unknown',
      totalActions: item._count.id,
    }));
  }

  // ============================================
  // 3. getMostChangedEntities()
  // ============================================

  /**
   * En çok değişiklik yapılan entity tiplerini getirir
   * 
   * @param limit - Kaç entity getirilsin? (default: 10, max: 100)
   * @returns ChangedEntity[] - Entity tipi ve toplam değişiklik sayısı
   * 
   * @example
   * const entities = await service.getMostChangedEntities(5);
   * // [{ entityType: 'Product', totalChanges: 450 }, ...]
   */
  async getMostChangedEntities(limit: number = 10): Promise<ChangedEntity[]> {
    const safeLimit = Math.min(this.MAX_LIMIT, Math.max(1, limit));

    const result = await this.prisma.auditLog.groupBy({
      by: ['entityType'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: safeLimit,
    });

    return result.map((item: { entityType: string; _count: { id: number } }) => ({
      entityType: item.entityType,
      totalChanges: item._count.id,
    }));
  }

  // ============================================
  // 4. getFailedAuditLogs()
  // ============================================

  /**
   * Başarısız audit log kayıtlarını getirir
   * Operasyonel monitoring için kullanılır
   * 
   * @param limit - Kaç kayıt getirilsin? (default: 100, max: 100)
   * @returns FailedAuditLogEntry[] - Başarısız log detayları
   * 
   * @example
   * const failedLogs = await service.getFailedAuditLogs(50);
   * // [{ id: 'audit_xxx', errorMessage: 'DB timeout', ... }]
   */
  async getFailedAuditLogs(limit: number = 100): Promise<FailedAuditLogEntry[]> {
    // MAX_LIMIT tutarlılığı düzeltildi (500 → MAX_LIMIT)
    const safeLimit = Math.min(this.MAX_LIMIT, Math.max(1, limit));

    logger.warn('Fetching failed audit logs', { limit: safeLimit });

    const logs = await this.prisma.auditLog.findMany({
      where: { status: 'failed' },
      orderBy: { timestamp: 'desc' },
      take: safeLimit,
      select: { id: true, userId: true, entityType: true, action: true, errorMessage: true, timestamp: true },
    });

    return logs.map((log: FailedAuditLogEntry) => ({
      id: log.id,
      userId: log.userId,
      entityType: log.entityType,
      action: log.action,
      errorMessage: log.errorMessage,
      timestamp: log.timestamp,
    }));
  }

  // ============================================
  // 5. getHourlyActivity()
  // ============================================

  /**
   * Belirli bir günün saatlik aktivite dağılımını getirir
   * 
   * @param date - Hangi gün? (default: bugün)
   * @returns HourlyActivity - Gün ve saatlik dağılım (0-23 saat)
   * 
   * @example
   * const activity = await service.getHourlyActivity(new Date('2024-01-15'));
   * // { date: '2024-01-15', hourlyActivity: { 9: 100, 10: 150, ... } }
   */
  async getHourlyActivity(date: Date = new Date()): Promise<HourlyActivity> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await this.prisma.auditLog.findMany({
      where: { timestamp: { gte: startOfDay, lte: endOfDay } },
      select: { timestamp: true },
    });

    const hourlyData: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourlyData[h] = 0;
    for (const log of logs) {
      hourlyData[log.timestamp.getHours()] = (hourlyData[log.timestamp.getHours()] || 0) + 1;
    }

    return { date: startOfDay.toISOString().split('T')[0], hourlyActivity: hourlyData };
  }

  // ============================================
  // 6. exportReport()
  // ============================================

  /**
   * Belirli dönem raporunu JSON string olarak dışa aktarır
   * 
   * @param startDate - Rapor başlangıç tarihi
   * @param endDate - Rapor bitiş tarihi
   * @returns string - JSON formatında rapor
   * 
   * @example
   * const reportJSON = await service.exportReport(
   *   new Date('2024-01-01'),
   *   new Date('2024-01-31')
   * );
   * // JSON string olarak kaydedilebilir veya API yanıtı olarak dönülebilir
   */
  async exportReport(startDate: Date, endDate: Date): Promise<string> {
    const report = await this.generateSummaryReport(startDate, endDate);
    return toJSON(report, { pretty: true });
  }

  // ============================================
  // 7. getDailyActivity() ★ YENİ
  // ============================================

  /**
   * Belirli bir dönem için günlük aktivite trendini getirir
   * Günlük CREATE, UPDATE, DELETE dağılımı
   * 
   * @param startDate - Başlangıç tarihi
   * @param endDate - Bitiş tarihi
   * @returns DailyActivity[] - Günlük aktivite listesi (kronolojik)
   * 
   * @example
   * const daily = await service.getDailyActivity(
   *   new Date('2024-01-01'),
   *   new Date('2024-01-31')
   * );
   * // [{ day: '2024-01-01', totalActions: 50, createCount: 10, updateCount: 30, deleteCount: 10 }, ...]
   */
  async getDailyActivity(startDate: Date, endDate: Date): Promise<DailyActivity[]> {
    // Validasyon
    if (!startDate || !endDate) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'startDate and endDate are required',
        statusCode: 400,
      });
    }
    if (startDate > endDate) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'startDate cannot be after endDate',
        statusCode: 400,
      });
    }

    const logs = await this.prisma.auditLog.findMany({
      where: { timestamp: { gte: startDate, lte: endDate } },
      select: { action: true, timestamp: true },
    });

    // Günlük dağılımı topla
    const dailyMap = new Map<string, { total: number; create: number; update: number; delete: number }>();

    for (const log of logs) {
      const day = log.timestamp.toISOString().split('T')[0];
      const current = dailyMap.get(day) || { total: 0, create: 0, update: 0, delete: 0 };

      current.total++;
      if (log.action === 'CREATE') current.create++;
      else if (log.action === 'UPDATE') current.update++;
      else if (log.action === 'DELETE') current.delete++;

      dailyMap.set(day, current);
    }

    // Kronolojik sıraya çevir
    const result: DailyActivity[] = [];
    const sortedDays = [...dailyMap.keys()].sort();

    for (const day of sortedDays) {
      const data = dailyMap.get(day)!;
      result.push({
        day,
        totalActions: data.total,
        createCount: data.create,
        updateCount: data.update,
        deleteCount: data.delete,
      });
    }

    return result;
  }

  // ============================================
  // 8. getTopErrorMessages() ★ YENİ
  // ============================================

  /**
   * En sık görülen hata mesajlarını getirir
   * Operasyonel iyileştirme için kritik
   * 
   * @param limit - Kaç hata getirilsin? (default: 10, max: 100)
   * @returns ErrorFrequency[] - Hata mesajı ve tekrar sayısı
   * 
   * @example
   * const topErrors = await service.getTopErrorMessages(5);
   * // [{ errorMessage: 'DB timeout', count: 45 }, ...]
   */
  async getTopErrorMessages(limit: number = 10): Promise<ErrorFrequency[]> {
    const safeLimit = Math.min(this.MAX_LIMIT, Math.max(1, limit));

    const result = await this.prisma.auditLog.groupBy({
      by: ['errorMessage'],
      where: {
        status: 'failed',
        errorMessage: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: safeLimit,
    });

    return result.map((item: { errorMessage: string | null; _count: { id: number } }) => ({
      errorMessage: item.errorMessage || 'Unknown error',
      count: item._count.id,
    }));
  }

  // ============================================
  // 9. getUserActivityTimeline() ★ YENİ
  // ============================================

  /**
   * Bir kullanıcının zaman içindeki aktivite paternini getirir
   * 
   * @param userId - Kullanıcı ID'si
   * @param period - 'day' | 'week' | 'month' (günlük/haftalık/aylık)
   * @returns ActivityTimeline - Kullanıcı aktivite timeline'ı
   * 
   * @example
   * const timeline = await service.getUserActivityTimeline('user-123', 'week');
   * // { userId: 'user-123', period: 'week', data: [{ date: '2024-01-01', actionCount: 15 }, ...] }
   */
  async getUserActivityTimeline(
    userId: string,
    period: 'day' | 'week' | 'month' = 'day',
  ): Promise<ActivityTimeline> {
    // Validasyon
    if (!userId) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'userId is required',
        statusCode: 400,
      });
    }

    // Dönem aralığını belirle
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'day':
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
    }

    const logs = await this.prisma.auditLog.findMany({
      where: {
        userId,
        timestamp: { gte: startDate },
      },
      select: { timestamp: true },
      orderBy: { timestamp: 'asc' },
    });

    // Tarih bazlı grupla
    const dateMap = new Map<string, number>();

    for (const log of logs) {
      let dateKey: string;

      switch (period) {
        case 'week':
          dateKey = log.timestamp.toISOString().split('T')[0];
          break;
        case 'month':
          dateKey = log.timestamp.toISOString().split('T')[0];
          break;
        case 'day':
        default:
          dateKey = log.timestamp.toISOString().split('T')[0];
          break;
      }

      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    }

    const data = [...dateMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, actionCount]) => ({ date, actionCount }));

    return { userId, period, data };
  }

  // ============================================
  // 10. getEntityChangeTrend() ★ YENİ
  // ============================================

  /**
   * Bir entity'nin değişim sıklığı trendini getirir
   * 
   * @param entityType - Entity tipi (User, Product, Order)
   * @param entityId - Entity'nin unique ID'si
   * @returns ChangeTrend - Toplam değişim, son değişim, günlük ortalama
   * 
   * @example
   * const trend = await service.getEntityChangeTrend('Product', 'prod-123');
   * // { entityType: 'Product', entityId: 'prod-123', totalChanges: 45, lastChangedAt: Date, avgChangesPerDay: 1.5 }
   */
  async getEntityChangeTrend(
    entityType: string,
    entityId: string,
  ): Promise<ChangeTrend> {
    // Validasyon
    if (!entityType || entityType.trim().length === 0) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'entityType is required and must be a non-empty string',
        statusCode: 400,
      });
    }
    if (!entityId || entityId.trim().length === 0) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'entityId is required and must be a non-empty string',
        statusCode: 400,
      });
    }

    const logs = await this.prisma.auditLog.findMany({
      where: {
        entityType: entityType.trim(),
        entityId: entityId.trim(),
      },
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true },
    });

    const totalChanges = logs.length;
    const lastChangedAt = totalChanges > 0 ? logs[totalChanges - 1].timestamp : null;

    // Günlük ortalama hesapla
    let avgChangesPerDay = 0;
    if (totalChanges > 0 && lastChangedAt) {
      const firstChangedAt = logs[0].timestamp;
      const dayDiff = Math.max(1, Math.ceil((lastChangedAt.getTime() - firstChangedAt.getTime()) / (24 * 60 * 60 * 1000)));
      avgChangesPerDay = parseFloat((totalChanges / dayDiff).toFixed(2));
    }

    return {
      entityType: entityType.trim(),
      entityId: entityId.trim(),
      totalChanges,
      lastChangedAt,
      avgChangesPerDay,
    };
  }
}