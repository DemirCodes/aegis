// Anomalinin ne kadar ciddi olduğunu belirten seviyeler
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

// İzlenen bir metriğin normal davranıştan sapıp sapmadığını gösterir
export type AnomalyDetectionResult = {
  isAnomaly: boolean;          // Normalden sapma var mı?
  score: number;               // Sapma şiddeti (0-1 arası, 1'e yaklaştıkça daha anormal)
  threshold: number;           // Normal kabul edilen maksimum eşik değeri
  severity: AnomalySeverity;   // Ne kadar acil müdahale gerekli?
  timestamp: Date;            // Tespit anı
};

// Kısa sürede oluşan ani yükseliş/patlamaları yakalar
export type SpikeDetectionResult = {
  hasSpike: boolean;           // Grafikte dik bir tepe oluştu mu?
  baselineValue: number;       // Normal seyreden ortalama değer
  peakValue: number;           // Patlamanın ulaştığı zirve noktası
  increasePercentage: number;  // Normalden ne kadar fırladı? (% cinsinden)
  detectedAt: Date;           // Patlamanın yaşandığı an
};

// Tek bir endpoint'in performans ölçümleri
export type EndpointMetric = {
  endpoint: string;            // Hangi API yolu? (/api/users gibi)
  method: string;             // Hangi HTTP metodu? (GET, POST, PUT, vs.)
  avgLatency?: number;        // Ortalama yanıt süresi (ms)
  errorRate?: number;         // Hata oranı (0-1 arası, 0.05 = %5 hata)
  throughput?: number;        // Saniye başına düşen istek sayısı
};

// Belirli zaman aralığının özet performans raporu
export type PerformanceReport = {
  period: { start: Date; end: Date };  // Hangi zaman dilimi?
  avgLatency: number;          // Tüm endpoint'lerin ortalama gecikmesi
  p95Latency: number;          // İsteklerin %95'i bu sürenin altında (ms)
  p99Latency: number;          // İsteklerin %99'u bu sürenin altında (ms)
  errorRate: number;           // Genel sistem hata oranı
  throughput: number;          // Sistemin genel işlem kapasitesi
  topSlowEndpoints: EndpointMetric[];    // En yavaş 5 endpoint (kırmızı alarm)
  topErrorEndpoints: EndpointMetric[];   // En çok hata alan 5 endpoint
};

// Servisin anlık sağlık kontrolü sonucu
export type HealthStatus = {
  serviceName: string;         // Hangi servis?
  status: 'healthy' | 'degraded' | 'unhealthy';  // Durum ne?
  uptime: number;             // Ne zamandır ayakta? (saniye)
  errorRate: number;          // Son dakikadaki hata oranı
  lastCheck: Date;           // Son sağlık kontrolünün zamanı
};

// Her endpoint için gecikme dağılım istatistikleri
export type LatencyPercentiles = {
  endpoint: string;           // Hangi endpoint?
  p50: number;               // İsteklerin yarısı bu sürede tamamlanır (medyan)
  p75: number;               // %75'i bu sürenin altında
  p95: number;               // %95'i bu sürenin altında
  p99: number;               // %99'u bu sürenin altında (genelde kritik eşik)
  max: number;               // En yavaş istek (anomalileri gösterir)
};

// Her endpoint'in hata detayları
export type ErrorRateMetrics = {
  endpoint: string;           // Hangi endpoint?
  method: string;            // Hangi metot?
  errorRate: number;         // Hata oranı (0-1 arası)
  errorCount: number;        // Kaç kere hata aldı?
  totalRequests: number;     // Toplam kaç istek geldi?
};

// Bir uyarı tetiklendiğinde ne yapılacağını tanımlar
export type AlertAction = {
  type: 'email' | 'slack' | 'webhook';  // Nereye haber verilecek?
  config: Record<string, any>;          // O kanala özel ayarlar (email adresi, webhook URL, vs.)
};

// Tespit edilen her anomali için oluşturulan olay kaydı
export type AnomalyEvent = {
  metricName: string;                 // Hangi metrikte anomali? (örn: "latency", "error_rate")
  result: AnomalyDetectionResult;     // Anomali detayları
  detectedAt: Date;                  // Ne zaman tespit edildi?
};