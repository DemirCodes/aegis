// ============================================
// @aegis/audit - Audit Types
// ============================================

// Audit işlem tipi: Oluşturma, Güncelleme, Silme
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

// Audit log durumu: Başarılı veya Başarısız
export type AuditStatus = 'completed' | 'failed';

// Audit metadata: IP, tarayıcı bilgisi, istek takip ID'si, özel alanlar
export type AuditMetadata = {
  ipAddress?: string;                    // İsteğin geldiği IP adresi
  userAgent?: string;                    // Kullanıcının tarayıcı bilgisi
  correlationId?: string;                // Request trace ID (zincirleme takip)
  customFields?: Record<string, any>;    // Ekstra özel metadata
};

// Tekil audit log kaydı
export type AuditLog = {
  id: string;                            // Log'un unique ID'si
  userId: string;                        // İşlemi yapan kullanıcı
  entityType: string;                    // Hangi entity? (User, Product, Order)
  entityId: string;                      // Entity'nin ID'si
  action: AuditAction;                   // Yapılan işlem
  changes: Record<string, { old: any; new: any }>; // Değişen alanlar (eski-yeni)
  changesSummary?: string;               // Değişikliklerin okunabilir özeti
  metadata?: AuditMetadata;              // IP, User-Agent gibi ek bilgiler
  timestamp: Date;                       // İşlem zamanı
  status: AuditStatus;                   // Başarılı mı, başarısız mı?
  errorMessage?: string;                 // Hata durumunda açıklama
};

// Audit log sorgulama filtreleri
export type AuditFilters = {
  userId?: string;        // Hangi kullanıcının log'ları?
  entityType?: string;    // Hangi entity tipi?
  action?: AuditAction;   // Hangi işlem tipi?
  startDate?: Date;       // Başlangıç tarihi
  endDate?: Date;         // Bitiş tarihi
  entityId?: string;      // Belirli bir entity ID'si
};

// Sayfalama seçenekleri
export type PaginationOptions = {
  page?: number;          // Kaçıncı sayfa? (1'den başlar)
  pageSize?: number;      // Sayfa başı kaç kayıt?
  sort?: string[];        // Sıralama (örn: ['createdAt:desc'])
};

// Sayfalanmış audit log sonucu
export type PaginatedAuditLogs = {
  data: AuditLog[];       // O sayfadaki log'lar
  total: number;          // Toplam kayıt sayısı
  page: number;           // Mevcut sayfa
  pageSize: number;       // Sayfa başı kayıt
  hasMore: boolean;       // Sonraki sayfa var mı?
};

// Kullanıcı aktivite akışı (timeline)
export type UserActivityLog = {
  timestamp: Date;                // Aktivite zamanı
  action: string;                 // Yapılan işlem
  entity: string;                 // Hangi entity üzerinde?
  entityId: string;               // Entity ID'si
  changes: Record<string, any>;   // Değişiklik detayı
  ipAddress?: string;             // İşlemin yapıldığı IP
};

// Aktivite geçmişi sorgulama seçenekleri
export type ActivityHistoryOptions = {
  limit?: number;              // Kaç kayıt getirilsin?
  includeFailures?: boolean;   // Başarısız işlemler dahil edilsin mi?
  entityFilters?: string[];    // Sadece belirli entity'leri getir
};

// Dışa aktarma formatları
export type ExportFormat = 'pdf' | 'csv' | 'json';

// @Audited decorator seçenekleri
export type AuditedOptions = {
  include?: string[];               // Log'lanacak alanlar (whitelist)
  exclude?: string[];               // Log'lanmayacak alanlar (blacklist)
  trackDeletes?: boolean;           // Silme işlemleri takip edilsin mi?
  sensitive?: boolean;              // Hassas veri modu açık mı?
  customFields?: Record<string, any>; // Ekstra metadata alanları
};


// Bulk create için input tipi
export type BulkCreateAuditLogInput = {
  userId: string;
  entityType: string;
  action: AuditAction;
  changes: Record<string, any>;
  metadata?: AuditMetadata;
};

