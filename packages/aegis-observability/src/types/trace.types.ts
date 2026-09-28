// ============================================================
// types/trace.types.ts
// ============================================================

// Trace Types

export interface Span {
  spanId: string;                 // Span ID
  traceId: string;                // Trace ID
  parentSpanId?: string;
  operationName: string;          // Operasyon adı
  duration: number;               // Süre
  status: 'ok' | 'error';         // Durum
  tags: Record<string, any>;      // Etiketler
  logs: SpanLog[];                // Span logları
  startTime: Date;                // Başlangıç zamanı
  endTime: Date;                  // Bitiş zamanı
}

export interface SpanLog {
  timestamp: Date;                // Zaman damgası
  fields: Record<string, any>;    // Alanlar
}

export interface ServiceCall {
  serviceName: string;            // Servis adı
  operationName: string;          // Operasyon adı
  duration: number;               // Süre
  status: 'ok' | 'error';         // Durum
}

export interface TraceDetails {
  traceId: string;                // Trace ID
  spans: Span[];                  // Span listesi
  duration: number;               // Süre
  status: 'success' | 'error';    // Durum
  serviceCalls: ServiceCall[];    // Servis çağrıları
  timestamp: Date;                // Zaman damgası
}

export interface TraceTree {
  traceId: string;          // Trace ID
  rootSpan: Span;           // Kök span
  children: TraceTree[];    // Alt ağaçlar
}

export interface SlowTrace {
  traceId: string;          // Trace ID
  duration: number;         // Süre
  operationName: string;    // Operasyon adı
  timestamp: Date;          // Zaman damgası
}

export interface FailedTrace {
  traceId: string;    // Trace ID
  error: string;      // Hata
  duration: number;   // Süre
  timestamp: Date;    // Zaman damgası
}

export interface DependencyGraph {
  nodes: Array<{ serviceName: string; type: 'service' | 'database' | 'external' }>; // Düğümler
  edges: Array<{ from: string; to: string; callCount: number }>;                     // Kenarlar
}