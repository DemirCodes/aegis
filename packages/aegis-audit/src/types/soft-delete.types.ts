// ============================================
// @aegis/audit - Soft Delete Types
// ============================================

/**
 * Soft delete işlem durumu
 * - soft_deleted: Kayıt soft delete edilmiş (silinmiş ama veritabanında duruyor)
 * - restored: Kayıt geri getirilmiş
 * - hard_deleted: Kayıt tamamen silinmiş (kalıcı silme)
 * - not_found: Kayıt bulunamadı
 */
export type SoftDeleteStatus = 'soft_deleted' | 'restored' | 'hard_deleted' | 'not_found';

/**
 * Soft delete işlem sonucu
 */
export type SoftDeleteResult = {
  entityType: string;          // Hangi entity? (User, Product, Order)
  entityId: string;            // Entity'nin unique ID'si
  status: SoftDeleteStatus;    // İşlem durumu
  deletedAt: Date | null;      // Silinme zamanı (restore/hard_delete'te null)
  deletedBy?: string;          // Kimin sildiği (opsiyonel)
  deletionReason?: string;     // Silme nedeni (opsiyonel)
};

/**
 * Soft delete edilmiş kayıt bilgisi
 * SoftDeleteRegistry modelinden gelen veri
 */
export type SoftDeletedRecord = {
  id: string;                  // Registry kaydının ID'si
  entityType: string;          // Entity tipi
  entityId: string;            // Entity ID'si
  originalData: Record<string, any>; // Silinmeden önceki veri (JSON)
  deletedBy: string | null;    // Kimin sildiği
  deletionReason: string | null; // Silme nedeni
  isHardDeleted: boolean;      // Kalıcı silinmiş mi?
  hardDeletedAt: Date | null;  // Kalıcı silinme zamanı
  createdAt: Date;             // Soft delete edilme zamanı
};

/**
 * Geri getirme (restore) işlem sonucu
 */
export type RestoreResult = {
  entityType: string;          // Hangi entity?
  entityId: string;            // Entity ID'si
  status: 'restored' | 'not_found' | 'already_active'; // Sonuç durumu
  restoredAt: Date | null;     // Geri getirilme zamanı
};

/**
 * Kalıcı silme (hard delete) işlem sonucu
 */
export type HardDeleteResult = {
  entityType: string;          // Hangi entity?
  entityId: string;            // Entity ID'si
  status: 'hard_deleted' | 'not_found' | 'not_soft_deleted'; // Sonuç durumu
  hardDeletedAt: Date | null;  // Kalıcı silinme zamanı
};

/**
 * Soft delete listeleme seçenekleri
 */
export type SoftDeleteListOptions = {
  entityType?: string;         // Belirli entity tipi
  limit?: number;              // Kaç kayıt getirilsin? (default: 100)
  offset?: number;             // Atlama sayısı (sayfalama)
  includeHardDeleted?: boolean; // Kalıcı silinenleri de dahil et? (default: false)
};

/**
 * Soft delete kontrol sonucu
 */
export type SoftDeleteCheckResult = {
  isSoftDeleted: boolean;      // Soft delete edilmiş mi?
  isHardDeleted: boolean;      // Kalıcı silinmiş mi?
  deletedAt: Date | null;      // Silinme zamanı
  deletedBy: string | null;    // Kimin sildiği
};

// Toplu soft delete için (opsiyonel)
export type SoftDeleteInput = {
  entityType: string;
  entityId: string;
  deletedBy?: string;
  deletionReason?: string;
};

// Toplu işlem sonucu (opsiyonel)
export type BulkSoftDeleteResult = {
  totalRequested: number;
  successCount: number;
  failedCount: number;
  results: SoftDeleteResult[];
};