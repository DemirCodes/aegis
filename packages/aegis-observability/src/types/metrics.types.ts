// src/types/metrics.types.ts
// Metrik, anomali, alert, health ve rapor tipleri.
// NOT: Log tipleri (LogEntry, LogSearchResult, LogStats) log.types.ts'e taşındı.

// Anomali tespiti sonuç tipi — detectZScore/IQR/Seasonal döner.
export interface AnomalyDetectionResult {
  isAnomaly: boolean;              // Anomali var mı?
  score: number;                   // Anomali skoru (0-100)
  severity: 'low' | 'medium' | 'high' | 'critical'; // Önem derecesi
  threshold: number;               // Kullanılan eşik değeri
  detectedAt: Date;                // Tespit zamanı
}

// Spike (ani yükselme) tespit sonucu — detectSpikeInMetric döner.
export interface SpikeDetectionResult {
  hasSpike: boolean;               // Spike var mı?
  increasePercentage: number;      // Yüzde olarak artış
  currentValue: number;            // Şu anki değer
  baselineValue: number;           // Referans (baz) değer
  detectedAt: Date;                // Tespit zamanı
}

// Anomali olay kaydı — getAnomalyHistory döner, alert tetikler.
export interface AnomalyEvent {
  id: string;                      // Olay ID (generateId)
  metricName: string;              // İlgili metrik adı
  score: number;                   // Anomali skoru
  severity: 'low' | 'medium' | 'high' | 'critical'; // Önem derecesi
  value: number;                   // Anomali anındaki değer
  threshold: number;               // Eşik değeri
  message: string;                 // Açıklama metni
  timestamp: Date;                 // Olay zamanı
}

// Alert tetiklendiğinde çalışacak aksiyon tipi.
export interface AlertAction {
  type: 'email' | 'slack' | 'webhook'; // Aksiyon türü
  config: Record<string, any>;         // Aksiyon ayarları (url, kanal vb.)
  handler?: (alert: AnomalyEvent) => Promise<void>; // Kullanıcı callback'i (opsiyonel)
}

// Anomali alert kuralı — setAnomalyAlert parametresi.
export interface AlertRule {
  metricName: string;              // İzlenecek metrik
  threshold: number;               // Eşik değeri
  action: AlertAction;             // Tetiklendiğinde ne yapılacak
}

// Performans raporu — generatePerformanceReport döner.
export interface PerformanceReport {
  startDate: Date;                 // Rapor başlangıç tarihi
  endDate: Date;                   // Rapor bitiş tarihi
  avgLatency: number;              // Ortalama gecikme (ms)
  p95Latency: number;              // %95 gecikme
  p99Latency: number;              // %99 gecikme
  errorRate: number;               // Hata oranı (%)
  throughput: number;              // Saniyedeki istek sayısı
  totalRequests: number;           // Toplam istek
  topSlowEndpoints: Array<{ endpoint: string; avgLatency: number }>; // En yavaş endpoint'ler
  topErrorEndpoints: Array<{ endpoint: string; errorRate: number }>; // En çok hata verenler
}

// Sağlık durumu — getServiceHealthStatus döner.
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'; // Genel durum
  errorRate: number;               // Hata oranı (%)
  uptime: number;                  // Çalışma süresi (%)
  avgLatency: number;              // Ortalama gecikme (ms)
  dependencies: Array<{ name: string; status: string; latency?: number }>; // Bağımlılık durumları
  timestamp: Date;                 // Ölçüm zamanı
}

// Endpoint bazlı metrik — getErrorRateByEndpoint döner.
export interface ErrorRateMetrics {
  endpoint: string;                // Endpoint yolu
  method: string;                  // HTTP metodu
  errorRate: number;               // Hata oranı (%)
  totalRequests: number;           // Toplam istek
  errorCount: number;              // Hata sayısı
}

// Endpoint latency percentile — getLatencyPercentiles döner.
export interface LatencyPercentiles {
  endpoint: string;                // Endpoint yolu
  p50: number;                     // Medyan
  p95: number;                     // %95
  p99: number;                     // %99
  max: number;                     // Maksimum
  min: number;                     // Minimum
  avg: number;                     // Ortalama
}

// Sistem genel bakış — getSystemOverview döner.
export interface SystemOverview {
  totalServices: number;           // Toplam servis
  healthyServices: number;         // Sağlıklı servis
  avgLatency: number;              // Ortalama gecikme
  errorRate: number;               // Ortalama hata oranı
  requestsPerSecond: number;       // Saniyedeki istek
  activeAnomalies: number;         // Aktif anomali sayısı
  timestamp: Date;                 // Ölçüm zamanı
}

// Prometheus sorgu sonucu — customMetricQuery döner.
export interface MetricResult {
  metric: string;                  // Metrik adı
  values: Array<{ timestamp: number; value: number }>; // Zaman serisi
  resultType: 'vector' | 'matrix' | 'scalar'; // Sonuç tipi
}

// Ödeme metrikleri — businessMetrics.paymentProcessing() döner.
export interface PaymentMetrics {
  recordLatency: (ms: number) => void;              // Gecikme kaydı
  recordSuccess: () => void;                        // Başarılı ödeme
  recordError: (errorType: string) => void;         // Hatalı ödeme (tip ile)
  getMetrics: () => Promise<{ count: number; avgLatency: number; errorRate: number }>; // Özet
}

// Endpoint metrikleri — businessMetrics.apiEndpoint() döner.
export interface EndpointMetrics {
  recordLatency: (ms: number) => void;              // Gecikme kaydı
  recordSuccess: () => void;                        // Başarılı istek
  recordError: () => void;                          // Hatalı istek
  getMetrics: () => Promise<{ count: number; avgLatency: number; errorRate: number }>; // Özet
}

// DB operasyon metrikleri — businessMetrics.databaseOperation() döner.
export interface DatabaseMetrics {
  recordLatency: (ms: number) => void;              // Sorgu süresi
  recordSuccess: () => void;                        // Başarılı sorgu
  recordError: () => void;                          // Hatalı sorgu
  recordRowCount: (count: number) => void;          // Etkilenen satır
}

// 3. parti servis metrikleri — businessMetrics.thirdPartyCall() döner.
export interface ThirdPartyMetrics {
  recordLatency: (ms: number) => void;              // Çağrı süresi
  recordSuccess: () => void;                        // Başarılı çağrı
  recordError: (errorType: string) => void;         // Hatalı çağrı
}

// Kullanıcı aksiyon metrikleri — businessMetrics.userAction() döner.
export interface UserMetrics {
  recordSuccess: () => void;                        // Başarılı aksiyon
  recordError: (reason?: string) => void;           // Hatalı aksiyon
}