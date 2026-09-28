// ============================================================
// types/log.types.ts
// ============================================================

import type { LogLevel } from './metrics.types';
import type { Span } from './trace.types';

// Log Types

export interface LogEntry {
  timestamp: Date;         // Zaman damgası
  level: LogLevel;         // Log seviyesi
  message: string;         // Mesaj
  traceId?: string;        // Trace ID (opsiyonel)
  service?: string;        // Servis (opsiyonel)
  [key: string]: any;      // Ek alanlar
}

export interface CorrelatedData {
  traceId: string;          // Trace ID
  spans: Span[];            // Span listesi
  logs: LogEntry[];         // Log listesi
  correlatedEvents: Array<{ // Korelasyonlu olaylar
    span: Span;             // Span
    logs: LogEntry[];       // Loglar
  }>;
}

export interface LogSearchResult {
  total: number;        // Toplam kayıt
  logs: LogEntry[];     // Log listesi
  took: number;         // Süre
}

export interface LogStats {
  totalLogs: number;                  // Toplam log
  byLevel: Record<string, number>;    // Seviyeye göre
  byService: Record<string, number>;  // Servise göre
  errorRate: number;                  // Hata oranı
}