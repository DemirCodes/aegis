// ============================================================
// utils/anomaly-algorithms.ts
// ============================================================

import type { AnomalySeverity } from '../types/metrics.types';

/**
 * README: detectZScoreAnomaly → "Z-score algoritması ile anomali tespiti"
 * Z-Score formülü: (value - mean) / stdDev
 */
export function calculateZScore(dataPoints: number[], value: number): number {
  if (dataPoints.length < 2) return 0;

  const mean = dataPoints.reduce((sum, n) => sum + n, 0) / dataPoints.length;
  const variance =
    dataPoints.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) /
    dataPoints.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  return (value - mean) / stdDev;
}

/**
 * README: detectIQRAnomaly → "IQR (Interquartile Range) ile robust anomali tespiti"
 * Q1, Q3, IQR ve alt/üst sınırları hesaplar.
 */
export function calculateIQR(dataPoints: number[]): {
  q1: number;
  q3: number;
  iqr: number;
  lowerBound: number;
  upperBound: number;
} {
  if (dataPoints.length === 0) {
    return { q1: 0, q3: 0, iqr: 0, lowerBound: 0, upperBound: 0 };
  }

  const sorted = [...dataPoints].sort((a, b) => a - b);
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;

  return {
    q1,
    q3,
    iqr,
    lowerBound: q1 - 1.5 * iqr,
    upperBound: q3 + 1.5 * iqr,
  };
}

/**
 * Percentile yardımcı (internal).
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * README: detectSeasonalAnomaly → "Basit Moving Average Decomposition"
 * Adımlar (README'den birebir):
 * 1. Veri noktalarını period'a göre grupla
 * 2. Her grup için moving average hesapla
 * 3. Trend = tüm veri ortalaması
 * 4. Seasonal = grup ortalaması - trend
 * 5. Residual = veri - trend - seasonal
 */
export function decomposeSeasonal(
  dataPoints: number[],
  period: number
): { trend: number; seasonal: number[]; residual: number[] } {
  const trend =
    dataPoints.length > 0
      ? dataPoints.reduce((sum, n) => sum + n, 0) / dataPoints.length
      : 0;

  const groupCount = Math.ceil(dataPoints.length / period);
  const groupAverages: number[] = [];

  for (let g = 0; g < groupCount; g++) {
    const start = g * period;
    const end = Math.min(start + period, dataPoints.length);
    const slice = dataPoints.slice(start, end);
    const avg = slice.length > 0
      ? slice.reduce((sum, n) => sum + n, 0) / slice.length
      : 0;
    groupAverages.push(avg);
  }

  const seasonal: number[] = [];
  const residual: number[] = [];

  for (let i = 0; i < dataPoints.length; i++) {
    const groupIndex = Math.floor(i / period);
    const seasonalValue = (groupAverages[groupIndex] ?? 0) - trend;
    seasonal.push(seasonalValue);
    residual.push(dataPoints[i] - trend - seasonalValue);
  }

  return { trend, seasonal, residual };
}

/**
 * README: SpikeDetectionResult → "increasePercentage: number"
 * Spike yüzdesi = ((peak - baseline) / baseline) * 100
 */
export function calculateSpikePercentage(
  baselineValue: number,
  peakValue: number
): number {
  if (baselineValue === 0) return peakValue > 0 ? 100 : 0;
  return ((peakValue - baselineValue) / baselineValue) * 100;
}

/**
 * README: getAnomalyScore →
 * "zScore_normalized = min(100, abs(zScore) * 20)"
 * "iqrScore_normalized = min(100, abs(iqrScore) * 25)"
 * Genel normalize: min(100, abs(rawScore) * weight)
 */
export function normalizeScore(rawScore: number, weight: number): number {
  return Math.min(100, Math.abs(rawScore) * weight);
}

/**
 * README: getAnomalyScore → "Severity Mapping"
 * 0-25 low / 26-50 medium / 51-75 high / 76-100 critical
 */
export function mapScoreToSeverity(score: number): AnomalySeverity {
  if (score <= 25) return 'low';
  if (score <= 50) return 'medium';
  if (score <= 75) return 'high';
  return 'critical';
}