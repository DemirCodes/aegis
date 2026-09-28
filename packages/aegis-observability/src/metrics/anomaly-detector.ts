// ============================================================
// metrics/anomaly-detector.ts
// ============================================================

import { AppError, createLogger, generateId } from '@aegis/core';
import type {
  AnomalyDetectionResult,
  SpikeDetectionResult,
  AnomalyEvent,
  AlertRule,
  AnomalySeverity,
} from '../types/metrics.types';
import {
  calculateZScore,
  calculateIQR,
  decomposeSeasonal,
  calculateSpikePercentage,
  normalizeScore,
  mapScoreToSeverity,
} from '../utils/anomaly-algorithms';
import { _getMetricBufferValues } from './metric-definitions';

const logger = createLogger('aegis-observability:anomaly-detector');

const MAX_HISTORY = 1000;
const anomalyHistory = new Map<string, AnomalyEvent[]>();
const alertRules = new Map<string, AlertRule>();

function pushHistory(metricName: string, event: AnomalyEvent): void {
  const list = anomalyHistory.get(metricName) ?? [];
  list.push(event);
  if (list.length > MAX_HISTORY) {
    list.shift();
  }
  anomalyHistory.set(metricName, list);
}

/**
 * README: "detectZScoreAnomaly(dataPoints, threshold?) →
 * Z-score algoritması ile anomali tespiti."
 * Boş array → isAnomaly: false, score: 0 (hata YOK).
 * Tek elemanlı array → std=0 → isAnomaly: false, score: 0.
 */
async function detectZScoreAnomaly(
  dataPoints: number[],
  threshold = 3
): Promise<AnomalyDetectionResult> {
  const timestamp = new Date();

  if (dataPoints.length < 2) {
    return {
      isAnomaly: false,
      score: 0,
      threshold,
      severity: 'low',
      timestamp,
    };
  }

  const latest = dataPoints[dataPoints.length - 1];
  const zScore = calculateZScore(dataPoints, latest);
  const isAnomaly = Math.abs(zScore) > threshold;
  const normalized = normalizeScore(zScore, 20);
  const severity = mapScoreToSeverity(normalized);

  return {
    isAnomaly,
    score: Math.abs(zScore),
    threshold,
    severity,
    timestamp,
  };
}

/**
 * README: "detectIQRAnomaly(dataPoints, multiplier?) →
 * IQR (Interquartile Range) ile robust anomali tespiti."
 * Boş array → isAnomaly: false, score: 0.
 */
async function detectIQRAnomaly(
  dataPoints: number[],
  multiplier = 1.5
): Promise<AnomalyDetectionResult> {
  const timestamp = new Date();

  if (dataPoints.length === 0) {
    return {
      isAnomaly: false,
      score: 0,
      threshold: multiplier,
      severity: 'low',
      timestamp,
    };
  }

  const { lowerBound, upperBound, iqr } = calculateIQR(dataPoints);
  const latest = dataPoints[dataPoints.length - 1];
  const isAnomaly = latest < lowerBound || latest > upperBound;
  const distance =
    latest > upperBound
      ? (latest - upperBound) / (iqr || 1)
      : latest < lowerBound
        ? (lowerBound - latest) / (iqr || 1)
        : 0;
  const normalized = normalizeScore(distance, 25);

  return {
    isAnomaly,
    score: distance,
    threshold: multiplier,
    severity: mapScoreToSeverity(normalized),
    timestamp,
  };
}

/**
 * README: "detectSeasonalAnomaly(dataPoints, period?) →
 * Mevsimsel/periodik anomali tespiti (Moving Average Decomposition)."
 * Hata: dataPoints.length < period * 2 → AppError('INSUFFICIENT_DATA', ..., 400)
 * Hata: period <= 0 → AppError('INVALID_PERIOD', ..., 400)
 */
async function detectSeasonalAnomaly(
  dataPoints: number[],
  period = 24
): Promise<AnomalyDetectionResult> {
  if (period <= 0) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'Period must be > 0',
      statusCode: 400,
    });
  }

  if (dataPoints.length < period * 2) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'At least 2 periods required',
      statusCode: 400,
    });
  }

  const { residual } = decomposeSeasonal(dataPoints, period);
  return detectZScoreAnomaly(residual, 3);
}

/**
 * README: "detectSpikeInMetric(metricName, threshold?) →
 * Metrikte ani yükselme tespiti. Default threshold: 200 (%)"
 */
async function detectSpikeInMetric(
  metricName: string,
  threshold = 200
): Promise<SpikeDetectionResult> {
  const values = _getMetricBufferValues(metricName);
  const detectedAt = new Date();

  if (values.length < 2) {
    return {
      hasSpike: false,
      baselineValue: values[0] ?? 0,
      peakValue: values[values.length - 1] ?? 0,
      increasePercentage: 0,
      detectedAt,
    };
  }

  const baselineValue = values[0];
  const peakValue = values[values.length - 1];
  const increasePercentage = calculateSpikePercentage(
    baselineValue,
    peakValue
  );
  const hasSpike = increasePercentage > threshold;

  return {
    hasSpike,
    baselineValue,
    peakValue,
    increasePercentage,
    detectedAt,
  };
}

/**
 * README: "getAnomalyScore(metricName) → Sürekli risk skoru (0-100).
 * score = (zScore_normalized * 0.6) + (iqrScore_normalized * 0.4).
 * Metrik bulunamazsa → 0 döner."
 */
async function getAnomalyScore(metricName: string): Promise<number> {
  const values = _getMetricBufferValues(metricName);
  if (values.length < 2) return 0;

  const zResult = await detectZScoreAnomaly(values, 3);
  const iqrResult = await detectIQRAnomaly(values, 1.5);

  const zNormalized = normalizeScore(zResult.score, 20);
  const iqrNormalized = normalizeScore(iqrResult.score, 25);
  const score = zNormalized * 0.6 + iqrNormalized * 0.4;

  // README: setAnomalyAlert → otomatik anomali alert'i kurar.
  // Anomali tespit edildiğinde alert handler'ları tetiklenir.
  const severity = mapScoreToSeverity(score);
  await _evaluateAlerts(metricName, {
    isAnomaly: score >= 51,
    score,
    threshold: 51,
    severity,
    timestamp: new Date(),
  });

  return score;
}

/**
 * README: "getAnomalyHistory(metricName?, limit?) → Geçmiş anomali kayıtları."
 */
async function getAnomalyHistory(
  metricName?: string,
  limit = 100
): Promise<AnomalyEvent[]> {
  if (metricName) {
    const list = anomalyHistory.get(metricName) ?? [];
    return list.slice(-limit);
  }
  const all: AnomalyEvent[] = [];
  for (const list of anomalyHistory.values()) {
    all.push(...list);
  }
  all.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  return all.slice(0, limit);
}

/**
 * README: "setAnomalyAlert(rule) → Otomatik anomali alert'i kurar.
 * Callback pattern. Dönüş: Promise<string> - Alert ID.
 * handler yoksa → logger.warn."
 */
async function setAnomalyAlert(rule: AlertRule): Promise<string> {
  if (!rule.metricName) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'Alert rule must have a metricName',
      statusCode: 400,
    });
  }

  const id = generateId('alert');
  alertRules.set(id, rule);
  logger.info('Anomaly alert registered', {
    id,
    metricName: rule.metricName,
    threshold: rule.threshold,
  });
  return id;
}

/**
 * Internal: Evaluates alert rules against a metric value.
 * Not part of README public API, used to trigger setAnomalyAlert handlers.
 */
export async function _evaluateAlerts(
  metricName: string,
  result: AnomalyDetectionResult
): Promise<void> {
  for (const [id, rule] of alertRules.entries()) {
    if (rule.metricName !== metricName) continue;
    if (result.score < rule.threshold) continue;

    const event: AnomalyEvent = {
      id,
      metricName,
      result,
      detectedAt: new Date(),
    };

    pushHistory(metricName, event);

    if (rule.action.handler) {
      try {
        await rule.action.handler(event);
      } catch (err) {
        logger.error('Anomaly alert handler failed', err as Error, { id });
      }
    } else {
      logger.warn('Anomaly detected (no handler configured)', {
        id,
        metricName,
        score: result.score,
      });
    }
  }
}

/**
 * README: "anomalyDetector.* (singleton)"
 */
export const anomalyDetector = {
  detectZScoreAnomaly,
  detectIQRAnomaly,
  detectSeasonalAnomaly,
  detectSpikeInMetric,
  getAnomalyScore,
  getAnomalyHistory,
  setAnomalyAlert,
};