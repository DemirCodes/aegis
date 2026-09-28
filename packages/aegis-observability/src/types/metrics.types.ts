// ============================================================
// types/metrics.types.ts
// ============================================================

// Enum Types

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
// Anomali ciddiyet seviyesi

export type HealthStatusLevel = 'healthy' | 'degraded' | 'unhealthy';
// Sağlık durumu seviyesi

export type TimeWindow = 'hour' | 'day' | 'week';
// Zaman aralığı

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
// Log seviyesi

export type AlertActionType = 'email' | 'slack' | 'webhook';
// Alert aksiyon tipi

// Anomaly Types

export interface AnomalyDetectionResult {
  isAnomaly: boolean;       // Anomali mi?
  score: number;            // Anomali skoru
  threshold: number;        // Eşik değeri
  severity: AnomalySeverity; // Ciddiyet seviyesi
  timestamp: Date;          // Zaman damgası
}

export interface SpikeDetectionResult {
  hasSpike: boolean;            // Spike var mı?
  baselineValue: number;        // Baz değer
  peakValue: number;            // Zirve değer
  increasePercentage: number;   // Artış yüzdesi
  detectedAt: Date;             // Tespit zamanı
}

export interface AnomalyEvent {
  id: string;                       // Event ID
  metricName: string;               // Metrik adı
  result: AnomalyDetectionResult;   // Anomali sonucu
  detectedAt: Date;                 // Tespit zamanı
}

export interface AlertAction {
  type: AlertActionType;                              // Alert tipi
  config: Record<string, any>;                        // Alert yapılandırması
  handler?: (alert: AnomalyEvent) => Promise<void>;   // Kullanıcı sağlar (opsiyonel)
}

export interface AlertRule {
  metricName: string;   // Metrik adı
  threshold: number;    // Eşik
  action: AlertAction;  // Aksiyon
}

// Business Metric Types

export interface PaymentMetrics {
  recordLatency(ms: number): void;         // Latency kaydı
  recordSuccess(): void;                   // Başarı kaydı
  recordError(errorType: string): void;    // Hata kaydı
}

export interface EndpointMetrics {
  recordLatency(ms: number): void;   // Latency kaydı
  recordSuccess(): void;             // Başarı kaydı
  recordError(): void;               // Hata kaydı
}

export interface DatabaseMetrics {
  recordLatency(ms: number): void;   // Latency kaydı
  recordSuccess(): void;             // Başarı kaydı
  recordError(): void;               // Hata kaydı
}

export interface ThirdPartyMetrics {
  recordLatency(ms: number): void;         // Latency kaydı
  recordSuccess(): void;                   // Başarı kaydı
  recordError(errorType: string): void;    // Hata kaydı
}

export interface UserMetrics {
  recordSuccess(): void;   // Başarı kaydı
  recordError(): void;     // Hata kaydı
}