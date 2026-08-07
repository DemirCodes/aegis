// ============================================
// @aegis/core - Common Types
// Framework genelinde kullanılan ortak tip tanımları
// ============================================

// --- SAYFALAMA (PAGINATION) ---

// Sayfalama sorguları için giriş parametreleri
export type PaginationOptions = {
  page?: number;              // İstenen sayfa numarası (1-indexed, varsayılan: 1)
  pageSize?: number;          // Sayfa başına kayıt sayısı (varsayılan: DEFAULT_PAGE_SIZE)
  sort?: string[];            // Sıralama kriterleri (örn: ["-createdAt", "+name"])
                              // - (eksi) = azalan, + (artı) = artan sıralama
};

// Sayfalanmış veri yanıtı (generic - her entity için kullanılabilir)
export type PaginatedResult<T> = {
  data: T[];                  // İstenen sayfadaki kayıtlar
  total: number;              // Filtreye uyan toplam kayıt sayısı
  page: number;               // Mevcut sayfa numarası
  pageSize: number;           // Sayfa başına kayıt sayısı
  hasMore: boolean;           // Sonraki sayfa var mı? (UI'da "daha fazla yükle" için)
};

// --- API YANIT FORMATI ---

// Tüm API yanıtları için standart sarmalayıcı (wrapper)
export type ApiResponse<T> = {
  success: boolean;                   // İşlem başarılı mı?
  data?: T;                           // Başarılı yanıt gövdesi
  error?: ApiError;                   // Hata durumunda detaylar
  metadata?: Record<string, any>;     // Ek bilgiler (requestId, processingTime, vs.)
  timestamp: Date;                    // Yanıtın oluşturulma zamanı (ISO 8601)
};

// API hata yanıtı detayı
export type ApiError = {
  code: string;                       // Hata kodu (ErrorCodes enum'ından)
  message: string;                    // Kullanıcı dostu hata mesajı
  details?: Record<string, any>;      // Teknik detaylar (validasyon hataları, stack trace)
  path?: string[];                    // Hatanın kaynaklandığı alan (örn: ["body", "email"])
};

// --- VERİTABANI MODELLERİ ---

// Tüm veritabanı modellerine eklenen standart zaman damgaları
export type Timestamps = {
  createdAt: Date;            // Kayıt oluşturulma zamanı (immutable)
  updatedAt: Date;            // Son güncellenme zamanı (her değişiklikte otomatik)
  deletedAt?: Date;           // Soft-delete zamanı (null değilse silinmiş demektir)
};

// --- DURUM/STATÜ ---

// Genel durum makinesi (state machine) için kullanılan statüler
export type Status = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
// pending   : İşlem başlatıldı, sonuç bekleniyor
// active    : İşlem devam ediyor
// completed : İşlem başarıyla tamamlandı
// failed    : İşlem başarısız oldu
// cancelled : İşlem iptal edildi

// --- DENETİM (AUDIT) ---

// Audit log'ları için bağlamsal metadata
export type AuditMetadata = {
  ipAddress?: string;                 // İsteğin geldiği IP adresi
  userAgent?: string;                 // İstemci bilgisi (tarayıcı/uygulama)
  correlationId?: string;             // İstek zinciri takip ID'si (trace-id)
  metadata?: Record<string, any>;     // Esnek ek bilgiler
};

// --- ALTYAPI KONFİGÜRASYONLARI ---

// Veritabanı bağlantı yapılandırması
export type DatabaseConfig = {
  host: string;               // Veritabanı sunucu adresi (IP veya hostname)
  port: number;               // Bağlantı portu (PostgreSQL: 5432, MySQL: 3306)
  database: string;           // Hedef veritabanı adı
  username: string;           // Veritabanı kullanıcı adı
  password: string;           // Veritabanı şifresi
  ssl?: boolean;              // SSL/TLS bağlantısı zorunlu mu?
  poolSize?: number;          // Bağlantı havuzu maksimum boyutu
};

// Redis/Önbellek bağlantı yapılandırması
export type RedisConfig = {
  host: string;               // Redis sunucu adresi
  port: number;               // Redis portu (varsayılan: 6379)
  password?: string;          // Redis şifresi (AUTH)
  db?: number;                // Redis veritabanı indeksi (0-15)
  keyPrefix?: string;         // Key öneki (ortam izolasyonu için: "app:prod:")
};

// --- SERİLEŞTİRME ---

// JSON serileştirme/deserileştirme opsiyonları
export type SerializationOptions = {
  pretty?: boolean;           // Formatlı/okunaklı JSON çıktısı (indentation)
  maxDepth?: number;          // Maksimum nesne derinliği (circular reference koruması)
};