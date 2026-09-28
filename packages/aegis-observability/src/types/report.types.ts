// ============================================================
// types/report.types.ts
// ============================================================

import type { HealthStatusLevel } from './metrics.types';

// Report Types

export interface PerformanceReport {
  period: { start: Date; end: Date };  // Dönem
  avgLatency: number;                  // Ortalama latency
  p95Latency: number;                  // p95 latency
  p99Latency: number;                  // p99 latency
  errorRate: number;                   // Hata oranı
  throughput: number;                  // Throughput
  topSlowEndpoints: EndpointMetric[];  // En yavaş endpoint'ler
  topErrorEndpoints: EndpointMetric[]; // En çok hata veren endpoint'ler
}

export interface EndpointMetric {
  endpoint: string;         // Endpoint
  method: string;           // Method
  avgLatency?: number;      // Ortalama latency (opsiyonel)
  errorRate?: number;       // Hata oranı (opsiyonel)
  throughput?: number;      // Throughput (opsiyonel)
}

export interface LatencyPercentiles {
  endpoint: string;   // Endpoint
  p50: number;        // p50
  p75: number;        // p75
  p95: number;        // p95
  p99: number;        // p99
  max: number;        // Maksimum
}

export interface ErrorRateMetrics {
  endpoint: string;        // Endpoint
  method: string;          // Method
  errorRate: number;       // Hata oranı
  errorCount: number;      // Hata sayısı
  totalRequests: number;   // Toplam istek
}

export interface HealthStatus {
  status: HealthStatusLevel;  // Durum
  uptime: number;             // Uptime
  errorRate: number;          // Hata oranı
  lastCheck: Date;            // Son kontrol
}

export interface SystemOverview {
  totalServices: number;       // Toplam servis
  healthyServices: number;     // Sağlıklı servis
  degradedServices: number;    // Bozuk servis
  unhealthyServices: number;   // Sağlıksız servis
  totalRequests: number;       // Toplam istek
  avgLatency: number;          // Ortalama latency
  errorRate: number;           // Hata oranı
  timestamp: Date;             // Zaman damgası
}
