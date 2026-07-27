// ═══════════════════════════════════════════════════
// AEGIS — Anomaly Detection
// Normalin dışında trafik/davranış tespiti.
// Z-score ve IQR tabanlı.
// ═══════════════════════════════════════════════════

// ──── TYPES ──────────────────────────────────────

type AnomalySensitivity = 'low' | 'medium' | 'high';

interface AnomalyResult {
  isAnomaly: boolean;
  score: number;
  threshold: number;
  method: 'zscore' | 'iqr';
  value: number;
  mean?: number;
  stdDev?: number;
}

interface MetricWindow {
  values: number[];
  windowMs: number;
  lastUpdated: number;
}

// ──── IN-MEMORY STORE ────────────────────────────

const metricWindows = new Map<string, MetricWindow>();
const DEFAULT_WINDOW_MS = 5 * 60 * 1000; // 5 dakika

// ──── SENSITIVITY THRESHOLDS ─────────────────────

const SENSITIVITY_MAP: Record<AnomalySensitivity, { zscore: number; iqr: number }> = {
  low:    { zscore: 3.5, iqr: 3.0 },  // Sadece aşırı uç değerler
  medium: { zscore: 2.5, iqr: 2.0 },  // Orta seviye
  high:   { zscore: 1.5, iqr: 1.5 },  // En ufak sapma
};

// ═══════════════════════════════════════════════════
// METRIC KAYIT
// ═══════════════════════════════════════════════════

function recordMetric(name: string, value: number, windowMs: number = DEFAULT_WINDOW_MS): void {
  const now = Date.now();
  let window = metricWindows.get(name);

  if (!window || (now - window.lastUpdated) > windowMs) {
    window = { values: [], windowMs, lastUpdated: now };
    metricWindows.set(name, window);
  }

  window.values.push(value);
  window.lastUpdated = now;

  // Pencere dışındaki değerleri temizle
  const cutoff = now - windowMs;
  window.values = window.values.filter((_, i) => {
    // Basit yaklaşım: değer sayısını sınırla
    return window!.values.length - i <= 1000;
  });
}

// ═══════════════════════════════════════════════════
// Z-SCORE ANOMALY
// ═══════════════════════════════════════════════════

function zScoreAnomaly(
  name: string,
  value: number,
  sensitivity: AnomalySensitivity = 'medium'
): AnomalyResult {
  const window = metricWindows.get(name);
  const threshold = SENSITIVITY_MAP[sensitivity].zscore;

  if (!window || window.values.length < 5) {
    // Yeterli veri yok, anomali yok say
    return {
      isAnomaly: false,
      score: 0,
      threshold,
      method: 'zscore',
      value,
    };
  }

  const mean = calculateMean(window.values);
  const stdDev = calculateStdDev(window.values, mean);

  if (stdDev === 0) {
    return {
      isAnomaly: value !== mean,
      score: value !== mean ? Infinity : 0,
      threshold,
      method: 'zscore',
      value,
      mean,
      stdDev,
    };
  }

  const zScore = Math.abs((value - mean) / stdDev);

  return {
    isAnomaly: zScore > threshold,
    score: Math.round(zScore * 100) / 100,
    threshold,
    method: 'zscore',
    value,
    mean: Math.round(mean * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
  };
}

// ═══════════════════════════════════════════════════
// IQR ANOMALY
// ═══════════════════════════════════════════════════

function iqrAnomaly(
  name: string,
  value: number,
  sensitivity: AnomalySensitivity = 'medium'
): AnomalyResult {
  const window = metricWindows.get(name);
  const threshold = SENSITIVITY_MAP[sensitivity].iqr;

  if (!window || window.values.length < 10) {
    return {
      isAnomaly: false,
      score: 0,
      threshold,
      method: 'iqr',
      value,
    };
  }

  const sorted = [...window.values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index]!;
  const q3 = sorted[q3Index]!;
  const iqr = q3 - q1;

  if (iqr === 0) {
    return {
      isAnomaly: value !== q1,
      score: value !== q1 ? Infinity : 0,
      threshold,
      method: 'iqr',
      value,
    };
  }

  const lowerBound = q1 - threshold * iqr;
  const upperBound = q3 + threshold * iqr;

  const isAnomaly = value < lowerBound || value > upperBound;
  const distance = Math.min(Math.abs(value - lowerBound), Math.abs(value - upperBound));
  const score = iqr > 0 ? distance / iqr : 0;

  return {
    isAnomaly,
    score: Math.round(score * 100) / 100,
    threshold,
    method: 'iqr',
    value,
  };
}

// ═══════════════════════════════════════════════════
// COMBINED ANOMALY CHECK
// ═══════════════════════════════════════════════════

function detectAnomaly(
  name: string,
  value: number,
  sensitivity: AnomalySensitivity = 'medium'
): AnomalyResult {
  // Önce kaydet
  recordMetric(name, value);

  // İki yöntemi de çalıştır
  const zResult = zScoreAnomaly(name, value, sensitivity);
  const iqrResult = iqrAnomaly(name, value, sensitivity);

  // En az biri anomali diyorsa anomali var
  const isAnomaly = zResult.isAnomaly || iqrResult.isAnomaly;
  const score = Math.max(zResult.score, iqrResult.score);
  const threshold = Math.min(zResult.threshold, iqrResult.threshold);

  return {
    isAnomaly,
    score,
    threshold,
    method: isAnomaly ? (zResult.isAnomaly ? 'zscore' : 'iqr') : 'zscore',
    value,
    mean: zResult.mean,
    stdDev: zResult.stdDev,
  };
}

// ═══════════════════════════════════════════════════
// STATISTICAL HELPERS
// ═══════════════════════════════════════════════════

function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calculateStdDev(values: number[], mean?: number): number {
  if (values.length < 2) return 0;
  const avg = mean ?? calculateMean(values);
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1));
}

// ═══════════════════════════════════════════════════
// TRAFFIC ANOMALY HELPERS
// ═══════════════════════════════════════════════════

function detectTrafficAnomaly(
  endpoint: string,
  requestCount: number,
  sensitivity: AnomalySensitivity = 'medium'
): AnomalyResult {
  return detectAnomaly(`traffic:${endpoint}`, requestCount, sensitivity);
}

function detectLatencyAnomaly(
  endpoint: string,
  latencyMs: number,
  sensitivity: AnomalySensitivity = 'medium'
): AnomalyResult {
  return detectAnomaly(`latency:${endpoint}`, latencyMs, sensitivity);
}

function detectErrorRateAnomaly(
  endpoint: string,
  errorRate: number,
  sensitivity: AnomalySensitivity = 'medium'
): AnomalyResult {
  return detectAnomaly(`error_rate:${endpoint}`, errorRate, sensitivity);
}

// ──── MANAGEMENT ─────────────────────────────────

function clearMetrics(): void {
  metricWindows.clear();
}

function getMetricCount(): number {
  return metricWindows.size;
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  recordMetric,
  zScoreAnomaly,
  iqrAnomaly,
  detectAnomaly,
  detectTrafficAnomaly,
  detectLatencyAnomaly,
  detectErrorRateAnomaly,
  calculateMean,
  calculateStdDev,
  clearMetrics,
  getMetricCount,
};

export type {
  AnomalySensitivity,
  AnomalyResult,
  MetricWindow,
};