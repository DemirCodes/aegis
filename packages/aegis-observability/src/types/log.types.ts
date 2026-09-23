// src/types/log.types.ts
// Log kayıtları, log arama ve log istatistikleri için tip tanımları.

// Tek bir log kaydı — Elasticsearch'ten dönen yapı.
export interface LogEntry {
  timestamp: Date;                     // Log kaydının oluştuğu an
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'; // Log seviyesi
  message: string;                     // Log mesajı
  service: string;                     // Logu üreten servis adı
  traceId?: string;                    // Korelasyon için trace ID (opsiyonel)
  spanId?: string;                     // Korelasyon için span ID (opsiyonel)
  correlationId?: string;              // Audit ile korelasyon için ID (opsiyonel)
  context?: Record<string, any>;       // Ek bağlam verisi (userId, requestId vb.)
  stack?: string;                      // Hata durumunda stack trace (opsiyonel)
}

// Log arama sonucu — searchLogs döner.
export interface LogSearchResult {
  total: number;                       // Toplam eşleşen kayıt sayısı
  logs: LogEntry[];                    // Eşleşen log kayıtları
  took: number;                        // Arama süresi (ms)
}

// Log istatistikleri — getLogStats döner.
export interface LogStats {
  totalLogs: number;                   // Toplam log sayısı
  byLevel: Record<string, number>;     // Seviyeye göre dağılım (error: 500, info: 10000)
  byService: Record<string, number>;   // Servise göre dağılım
  errorRate: number;                   // Hata oranı (%)
  timeRange?: {                        // İstatistiğin kapsadığı zaman aralığı
    start: Date;
    end: Date;
  };
}

// Log arama filtre seçenekleri — searchLogs ikinci parametre.
export interface LogSearchOptions {
  level?: string;                      // Seviye filtresi
  service?: string;                    // Servis filtresi
  startDate?: Date;                    // Başlangıç tarihi
  endDate?: Date;                      // Bitiş tarihi
  limit?: number;                      // Maksimum kayıt sayısı
  offset?: number;                     // Sayfalama için başlangıç
}

// Log istatistiği filtre seçenekleri — getLogStats parametre.
export interface LogStatsFilters {
  startDate?: Date;                    // Başlangıç tarihi
  endDate?: Date;                      // Bitiş tarihi
  service?: string;                    // Servis filtresi
}