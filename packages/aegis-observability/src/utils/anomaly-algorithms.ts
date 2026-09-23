// src/utils/anomaly-algorithms.ts
// Saf matematiksel anomali tespit algoritmaları.
// Hiçbir dış bağımlılık yok — saf fonksiyonlar (test edilebilir).

import type { AnomalyDetectionResult, SpikeDetectionResult } from '../types/metrics.types';

// Yardımcı: sayı dizisinin ortalamasını hesaplar.
function mean(data: number[]): number {
  if (data.length === 0) return 0;                       // Boş dizi → 0
  return data.reduce((sum, v) => sum + v, 0) / data.length; // Toplam / adet
}

// Yardımcı: standart sapmayı hesaplar (popülasyon).
function stdDev(data: number[]): number {
  if (data.length === 0) return 0;                       // Boş dizi → 0
  const avg = mean(data);                                // Ortalama
  const variance = data.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / data.length; // Varyans
  return Math.sqrt(variance);                            // Karekök → std sapma
}

// Yardımcı: veriyi küçükten büyüğe sıralar (kopya üzerinde, orijinali bozmaz).
function sorted(data: number[]): number[] {
  return [...data].sort((a, b) => a - b);                // Kopyala + sırala
}

// Yardımcı: percentile hesaplar (0-100 arası).
function percentile(data: number[], p: number): number {
  if (data.length === 0) return 0;                       // Boş dizi → 0
  const s = sorted(data);                                // Sıralı kopya
  const idx = (p / 100) * (s.length - 1);                // İndeks (kesirli olabilir)
  const lower = Math.floor(idx);                         // Alt indeks
  const upper = Math.ceil(idx);                          // Üst indeks
  if (lower === upper) return s[lower];                  // Tam denk geldi
  const weight = idx - lower;                            // Ağırlık
  return s[lower] * (1 - weight) + s[upper] * weight;    // Lineer interpolasyon
}

// Yardımcı: severity belirleme (skora göre).
function severityFromScore(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 80) return 'critical';                    // 80+ → kritik
  if (score >= 60) return 'high';                        // 60-79 → yüksek
  if (score >= 40) return 'medium';                      // 40-59 → orta
  return 'low';                                          // <40 → düşük
}

// Z-Score anomali tespiti: veri ortalamadan kaç sigma sapıyor?
export function detectZScoreAnomaly(
  dataPoints: number[],                                  // Veri noktaları
  threshold: number = 3                                  // Sigma eşiği (default 3)
): AnomalyDetectionResult {
  const detectedAt = new Date();                         // Tespit zamanı
  if (dataPoints.length < 2) {                           // Yetersiz veri
    return { isAnomaly: false, score: 0, severity: 'low', threshold, detectedAt };
  }
  const avg = mean(dataPoints);                          // Ortalama
  const sd = stdDev(dataPoints);                         // Std sapma
  if (sd === 0) {                                        // Tüm değerler aynı
    return { isAnomaly: false, score: 0, severity: 'low', threshold, detectedAt };
  }
  const last = dataPoints[dataPoints.length - 1];        // Son değer
  const zScore = Math.abs((last - avg) / sd);            // Z-skoru
  const isAnomaly = zScore > threshold;                  // Eşiği aştı mı?
  const score = Math.min(100, (zScore / threshold) * 50); // Skor (0-100, normalize)
  return {
    isAnomaly,
    score: Math.round(score),
    severity: severityFromScore(score),
    threshold,
    detectedAt,
  };
}

// IQR anomali tespiti: çeyrekler arası açıklığa göre (robust, outlier'a dayanıklı).
export function detectIQRAnomaly(
  dataPoints: number[],                                  // Veri noktaları
  multiplier: number = 1.5                               // IQR çarpanı (default 1.5)
): AnomalyDetectionResult {
  const detectedAt = new Date();                         // Tespit zamanı
  if (dataPoints.length < 4) {                           // Yetersiz veri
    return { isAnomaly: false, score: 0, severity: 'low', threshold: multiplier, detectedAt };
  }
  const q1 = percentile(dataPoints, 25);                 // 1. çeyrek
  const q3 = percentile(dataPoints, 75);                 // 3. çeyrek
  const iqr = q3 - q1;                                   // IQR
  const lowerBound = q1 - multiplier * iqr;              // Alt sınır
  const upperBound = q3 + multiplier * iqr;              // Üst sınır
  const last = dataPoints[dataPoints.length - 1];        // Son değer
  const isAnomaly = last < lowerBound || last > upperBound; // Sınır dışı mı?
  // Skor: sınıra ne kadar yakın/uzak?
  let score = 0;
  if (isAnomaly) {
    const distance = last > upperBound ? last - upperBound : lowerBound - last;
    score = Math.min(100, (distance / (iqr || 1)) * 50);
  }
  return {
    isAnomaly,
    score: Math.round(score),
    severity: severityFromScore(score),
    threshold: multiplier,
    detectedAt,
  };
}

// Mevsimsel/periodik anomali: aynı fazdaki değerlerle karşılaştırır.
export function detectSeasonalAnomaly(
  dataPoints: number[],                                  // Veri (kronolojik)
  period: number                                         // Periyot (örn: 24 saat)
): AnomalyDetectionResult {
  const detectedAt = new Date();                         // Tespit zamanı
  if (period <= 0 || dataPoints.length < period * 2) {   // Yetersiz veri (en az 2 periyot)
    return { isAnomaly: false, score: 0, severity: 'low', threshold: 3, detectedAt };
  }
  const last = dataPoints[dataPoints.length - 1];        // Son değer
  // Aynı fazdaki değerleri topla (son - period, son - 2*period, ...)
  const samePhase: number[] = [];
  for (let i = dataPoints.length - 1 - period; i >= 0; i -= period) {
    samePhase.push(dataPoints[i]);
  }
  if (samePhase.length < 2) {                            // Yeterli faz verisi yok
    return { isAnomaly: false, score: 0, severity: 'low', threshold: 3, detectedAt };
  }
  const avg = mean(samePhase);                           // Aynı fazın ortalaması
  const sd = stdDev(samePhase);                          // Aynı fazın std sapması
  if (sd === 0) {                                        // Sapma yok
    return { isAnomaly: false, score: 0, severity: 'low', threshold: 3, detectedAt };
  }
  const zScore = Math.abs((last - avg) / sd);            // Z-skoru
  const threshold = 3;                                   // 3 sigma
  const isAnomaly = zScore > threshold;                  // Eşik aştı mı?
  const score = Math.min(100, (zScore / threshold) * 50); // Normalize skor
  return {
    isAnomaly,
    score: Math.round(score),
    severity: severityFromScore(score),
    threshold,
    detectedAt,
  };
}

// Spike tespiti: son değer, baseline'ın belirgin üstünde mi?
export function detectSpike(
  dataPoints: number[],                                  // Veri noktaları
  thresholdPercentage: number = 100                      // Yüzde eşiği (default 100%)
): SpikeDetectionResult {
  const detectedAt = new Date();                         // Tespit zamanı
  if (dataPoints.length < 2) {                           // Yetersiz veri
    return {
      hasSpike: false,
      increasePercentage: 0,
      currentValue: dataPoints[0] ?? 0,
      baselineValue: dataPoints[0] ?? 0,
      detectedAt,
    };
  }
  const last = dataPoints[dataPoints.length - 1];        // Son değer
  const baseline = mean(dataPoints.slice(0, -1));        // Öncekilerin ortalaması
  const currentValue = last;                             // Şu anki değer
  const increasePercentage = baseline === 0             // Baseline sıfır mı?
    ? (last > 0 ? Infinity : 0)                          // Sonsuz artış veya 0
    : ((last - baseline) / baseline) * 100;              // Yüzde artış
  const hasSpike = increasePercentage >= thresholdPercentage; // Eşiği aştı mı?
  return {
    hasSpike,
    increasePercentage: Math.round(increasePercentage * 100) / 100, // 2 ondalık
    currentValue,
    baselineValue: Math.round(baseline * 100) / 100,     // 2 ondalık
    detectedAt,
  };
}

// Anomali skorundan event mesajı üretir (alert/log için).
export function buildAnomalyMessage(
  metricName: string,                                    // Metrik adı
  result: AnomalyDetectionResult                         // Anomali sonucu
): string {
  return `[${result.severity.toUpperCase()}] Anomaly detected on "${metricName}" ` +
         `(score: ${result.score}, threshold: ${result.threshold})`; // Okunabilir mesaj
}