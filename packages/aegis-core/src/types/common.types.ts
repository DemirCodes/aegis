// ============================================
// @aegis/core - Common Types
// Framework genelinde kullanılan ortak tip tanımları
// ============================================

// --- SAYFALAMA (PAGINATION) ---

export type PaginationOptions = {
  page?: number;
  pageSize?: number;
  sort?: string[];
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

// --- DEĞİŞİKLİK TESPİTİ (DIFF) ---

// İki obje arasındaki değişiklikleri tutan map
// Her alan için eski ve yeni değer saklanır
export type ChangesMap = Record<string, { old: any; new: any }>;

// --- API YANIT FORMATI ---

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: Record<string, any>;
  timestamp: Date;
};

export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, any>;
  path?: string[];
};

// --- VERİTABANI MODELLERİ ---

export type Timestamps = {
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};

// --- DURUM/STATÜ ---

export type Status = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';

// --- DENETİM (AUDIT) ---

export type AuditMetadata = {
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
};

// --- ALTYAPI KONFİGÜRASYONLARI ---

export type DatabaseConfig = {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
};

export type RedisConfig = {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
};

// --- SERİLEŞTİRME ---

export type SerializationOptions = {
  pretty?: boolean;
  maxDepth?: number;
};