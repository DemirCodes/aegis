// ============================================================
// types/prometheus.types.ts
// ============================================================

// Prometheus Types

export interface PrometheusQuery {
  expression: string;   // İfade
  start: Date;          // Başlangıç
  end: Date;            // Bitiş
  step?: string;        // Adım (opsiyonel)
}

export interface MetricResult {
  metric: Record<string, string>;   // Metrik
  value: number[];                  // Değerler
  timestamps: Date[];               // Zaman damgaları
}
