// src/types/trace.types.ts
// Distributed tracing (span, trace, korelasyon) için tip tanımları.

import { LogEntry } from './log.types'; // LogEntry tipini kullanıyoruz

// Tek bir span kaydı — OTel'den gelen yapı.
export interface Span {
  spanId: string;                      // Span benzersiz ID
  traceId: string;                     // Ait olduğu trace ID
  parentSpanId?: string;               // Üst span ID (root ise undefined)
  name: string;                        // Span adı (örn: "GET /api/users")
  serviceName: string;                 // Span'ı üreten servis
  startTime: Date;                     // Başlangıç zamanı
  endTime: Date;                       // Bitiş zamanı
  duration: number;                    // Süre (ms)
  status: 'ok' | 'error' | 'unset';    // Span durumu
  attributes: Record<string, any>;     // Ek nitelikler (http.method vb.)
  events?: SpanEvent[];                // Span içi olaylar
}

// Span içinde gerçekleşen olay (log, exception vb.)
export interface SpanEvent {
  name: string;                        // Olay adı
  timestamp: Date;                     // Olay zamanı
  attributes: Record<string, any>;     // Olay nitelikleri
}

// Trace detayları — getTraceDetails döner.
export interface TraceDetails {
  traceId: string;                     // Trace ID
  rootSpan: Span;                      // Kök span
  spans: Span[];                       // Tüm span'lar (düz liste)
  duration: number;                    // Toplam süre (ms)
  status: 'success' | 'error' | 'partial'; // Genel durum
  startTime: Date;                     // Başlangıç
  endTime: Date;                       // Bitiş
}

// Trace ağaç yapısı — getTraceTree döner.
export interface TraceTree {
  rootSpan: Span;                      // Kök span
  children: TraceTreeNode[];           // Alt span'lar (hiyerarşik)
}

// Ağaçtaki tek bir düğüm (recursive).
export interface TraceTreeNode {
  span: Span;                          // Bu düğümdeki span
  children: TraceTreeNode[];           // Alt düğümler
}

// Yavaş trace kaydı — getSlowTraces döner.
export interface SlowTrace {
  traceId: string;                     // Trace ID
  duration: number;                    // Süre (ms)
  serviceName: string;                 // Servis adı
  operationName: string;               // İşlem adı
  startTime: Date;                     // Başlangıç zamanı
}

// Başarısız trace kaydı — getFailedTraces döner.
export interface FailedTrace {
  traceId: string;                     // Trace ID
  duration: number;                    // Süre (ms)
  serviceName: string;                 // Servis adı
  operationName: string;               // İşlem adı
  errorMessage: string;                // Hata mesajı
  startTime: Date;                     // Başlangıç zamanı
}

// Trace + log + audit korelasyon verisi — correlateTraceWithLogs döner.
export interface CorrelatedData {
  traceId: string;                     // Trace ID
  spans: Span[];                       // İlgili span'lar
  logs: LogEntry[];                    // İlgili log kayıtları
  auditLogs: AuditLogEntry[];          // İlgili audit kayıtları
}

// Audit paketinden gelen audit log kaydı (import edilmez, yapısal eşleşme).
export interface AuditLogEntry {
  id: string;                          // Audit kayıt ID
  action: string;                      // Yapılan aksiyon
  userId?: string;                     // Kullanıcı ID
  resource: string;                    // Etkilenen kaynak
  timestamp: Date;                     // Zaman
  correlationId?: string;              // Korelasyon ID
  metadata?: Record<string, any>;      // Ek veri
}

// Servisler arası çağrı kaydı — dependency graph için.
export interface ServiceCall {
  from: string;                        // Kaynak servis
  to: string;                          // Hedef servis
  callCount: number;                   // Çağrı sayısı
  avgLatency?: number;                 // Ortalama gecikme
  errorRate?: number;                  // Hata oranı
}

// Servis bağımlılık grafiği — getDependencyGraph döner.
export interface DependencyGraph {
  nodes: string[];                     // Servis düğümleri
  edges: ServiceCall[];                // Servisler arası çağrılar
}

// Prometheus sorgu parametresi (internal).
export interface PrometheusQuery {
  query: string;                       // PromQL ifadesi
  time?: Date;                         // Sorgu zamanı
  timeout?: number;                    // Zaman aşımı (ms)
}