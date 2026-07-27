// ═══════════════════════════════════════════════════
// AEGIS — GDPR Right to Erasure
// Kullanıcının tüm verilerini GDPR/KVKK uyumlu siler.
// Cascade delete + audit log + soft delete desteği.
// ═══════════════════════════════════════════════════

import crypto from 'node:crypto';

// ──── TYPES ──────────────────────────────────────

type ErasureStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

interface ErasureRequest {
  id: string;
  userId: string;
  status: ErasureStatus;
  requestedAt: number;
  completedAt?: number;
  dataCategories: DataCategory[];
  options: ErasureOptions;
  auditTrail: ErasureAuditEntry[];
}

interface ErasureOptions {
  softDelete?: boolean;
  notifyDPO?: boolean;
  notifyUser?: boolean;
  retentionPeriodDays?: number;  // Bazı veriler yasal olarak saklanmalı
  excludedCategories?: DataCategory[];
}

type DataCategory = 
  | 'profile'
  | 'transactions'
  | 'logs'
  | 'analytics'
  | 'communications'
  | 'auth'
  | 'preferences'
  | 'third_party'
  | 'backups'
  | 'all';

interface ErasureAuditEntry {
  timestamp: number;
  action: string;
  category: DataCategory;
  status: 'success' | 'failed';
  details?: string;
}

interface ErasureResult {
  success: boolean;
  requestId: string;
  categoriesProcessed: number;
  categoriesFailed: number;
  errors: string[];
  auditTrail: ErasureAuditEntry[];
}

// ──── ERASURE STORE ──────────────────────────────

const erasureRequests = new Map<string, ErasureRequest>();
const DELETED_MARKER = '__GDPR_DELETED__';
const ANONYMIZED_MARKER = '__GDPR_ANONYMIZED__';

// ═══════════════════════════════════════════════════
// ERASURE ENGINE
// ═══════════════════════════════════════════════════

class GDPRErasureEngine {
  private dataStores: Map<DataCategory, DataStoreHandler> = new Map();

  // ══════════════════════════════════════════════

  /**
   * Veri kategorisi için handler kaydet
   */
  registerHandler(category: DataCategory, handler: DataStoreHandler): void {
    this.dataStores.set(category, handler);
  }

  // ══════════════════════════════════════════════

  /**
   * Silme talebi oluştur
   */
  async requestErasure(
    userId: string,
    options: ErasureOptions = {}
  ): Promise<ErasureRequest> {
    const id = `erasure_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;


    const categories: DataCategory[] = options.excludedCategories
    ? ALL_CATEGORIES.filter((c): c is DataCategory => !options.excludedCategories!.includes(c))
    : ['all'];
    
    
    const request: ErasureRequest = {
      id,
      userId,
      status: 'pending',
      requestedAt: Date.now(),
      dataCategories: categories,
      options: {
        softDelete: true,
        notifyDPO: true,
        retentionPeriodDays: 30,
        ...options,
      },
      auditTrail: [],
    };

    erasureRequests.set(id, request);

    // Otomatik işleme başlat
    if (request.options.retentionPeriodDays === 0) {
      await this.executeErasure(id);
    } else {
      // Planlanmış silme için zamanlayıcı
      const delayMs = (request.options.retentionPeriodDays || 30) * 24 * 60 * 60 * 1000;
      setTimeout(() => this.executeErasure(id), delayMs);
    }

    return request;
  }

  // ══════════════════════════════════════════════

  /**
   * Silme işlemini çalıştır
   */
  async executeErasure(requestId: string): Promise<ErasureResult> {
    const request = erasureRequests.get(requestId);
    if (!request) {
      throw new Error(`Erasure request not found: ${requestId}`);
    }

    request.status = 'in_progress';
    const errors: string[] = [];
    let categoriesProcessed = 0;
    let categoriesFailed = 0;

    for (const category of request.dataCategories) {
      const handler = this.dataStores.get(category);
      
      const auditEntry: ErasureAuditEntry = {
        timestamp: Date.now(),
        action: request.options.softDelete ? 'soft_delete' : 'hard_delete',
        category,
        status: 'success',
      };

      try {
        if (handler) {
            await handler.delete(request.userId, {
                soft: request.options.softDelete ?? true,
            });
        }
        categoriesProcessed++;
      } catch (error: any) {
        auditEntry.status = 'failed';
        auditEntry.details = error?.message;
        errors.push(`${category}: ${error?.message}`);
        categoriesFailed++;
      }

      request.auditTrail.push(auditEntry);
    }

    request.status = categoriesFailed === 0 ? 'completed' : 'failed';
    request.completedAt = Date.now();
    erasureRequests.set(requestId, request);

    return {
      success: categoriesFailed === 0,
      requestId,
      categoriesProcessed,
      categoriesFailed,
      errors,
      auditTrail: request.auditTrail,
    };
  }

  // ══════════════════════════════════════════════

  /**
   * Silme talebini iptal et
   */
  cancelErasure(requestId: string): boolean {
    const request = erasureRequests.get(requestId);
    if (!request || request.status === 'completed') return false;

    request.status = 'cancelled';
    request.auditTrail.push({
      timestamp: Date.now(),
      action: 'cancelled',
      category: 'all',
      status: 'success',
    });

    return true;
  }

  // ══════════════════════════════════════════════

  /**
   * Silme talebi durumunu sorgula
   */
  getErasureStatus(requestId: string): ErasureRequest | null {
    return erasureRequests.get(requestId) || null;
  }

  // ══════════════════════════════════════════════

  /**
   * Kullanıcının tüm silme taleplerini getir
   */
  getUserErasureRequests(userId: string): ErasureRequest[] {
    return Array.from(erasureRequests.values())
      .filter(r => r.userId === userId);
  }
}

// ═══════════════════════════════════════════════════
// DATA STORE HANDLER INTERFACE
// ═══════════════════════════════════════════════════

interface DataStoreHandler {
  delete(userId: string, options: { soft: boolean }): Promise<void>;
  restore?(userId: string): Promise<void>;
  export?(userId: string): Promise<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════
// BUILT-IN HANDLERS
// ═══════════════════════════════════════════════════

/**
 * In-memory handler — test için
 */
class MemoryDataStoreHandler implements DataStoreHandler {
  private data: Map<string, Record<string, unknown>>;

  constructor() {
    this.data = new Map();
  }

  async delete(userId: string, options: { soft: boolean }): Promise<void> {
    if (options.soft) {
      const user = this.data.get(userId);
      if (user) {
        user.deleted = true;
        user.deletedAt = new Date().toISOString();
        user.data = DELETED_MARKER;
      }
    } else {
      this.data.delete(userId);
    }
  }
}

// ═══════════════════════════════════════════════════
// DATA ANONYMIZATION
// ═══════════════════════════════════════════════════

function anonymizeData(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      if (isPIIField(key)) {
        result[key] = ANONYMIZED_MARKER;
      } else {
        result[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = anonymizeData(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

function isPIIField(fieldName: string): boolean {
  const piiPatterns = [
    'name', 'email', 'phone', 'address', 'birth',
    'passport', 'identity', 'ssn', 'tax', 'iban',
    'card', 'cvv', 'password', 'secret', 'token',
  ];

  const lower = fieldName.toLowerCase();
  return piiPatterns.some(p => lower.includes(p));
}

// ═══════════════════════════════════════════════════
// AUDIT TRAIL EXPORT
// ═══════════════════════════════════════════════════

function exportAuditTrail(requestId: string): ErasureAuditEntry[] | null {
  const request = erasureRequests.get(requestId);
  return request ? request.auditTrail : null;
}

function generateComplianceReport(): {
  totalRequests: number;
  completed: number;
  pending: number;
  failed: number;
} {
  const requests = Array.from(erasureRequests.values());
  return {
    totalRequests: requests.length,
    completed: requests.filter(r => r.status === 'completed').length,
    pending: requests.filter(r => r.status === 'pending' || r.status === 'in_progress').length,
    failed: requests.filter(r => r.status === 'failed').length,
  };
}

// ──── CONSTANTS ──────────────────────────────────

const ALL_CATEGORIES: DataCategory[] = [
  'profile', 'transactions', 'logs', 'analytics',
  'communications', 'auth', 'preferences', 'third_party', 'backups',
];

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  GDPRErasureEngine,
  MemoryDataStoreHandler,
  anonymizeData,
  isPIIField,
  exportAuditTrail,
  generateComplianceReport,
  ALL_CATEGORIES,
};

export type {
  ErasureStatus,
  ErasureRequest,
  ErasureOptions,
  DataCategory,
  ErasureAuditEntry,
  ErasureResult,
  DataStoreHandler,
};