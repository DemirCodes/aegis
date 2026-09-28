// ============================================================
// metrics/metric-definitions.ts
// ============================================================

import { Histogram, Gauge, Counter, register } from 'prom-client';
import { AppError, createLogger } from '@aegis/core';
import {
  getOrCreateCacheEntry,
  normalizeMetricName,
  validateLabelSet,
} from '../utils/metric-helpers';

const logger = createLogger('aegis-observability:metric-definitions');

/**
 * Circular buffer for metric values.
 * O(1) push, O(1) overwrite. Fixed capacity.
 * README: "Ring buffer boyutu (metric başına)" → metricBufferSize
 */
class RingBuffer {
  private buffer: number[];
  private index = 0;
  private filled = false;

  constructor(private readonly capacity: number) {
    if (capacity <= 0) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'RingBuffer capacity must be > 0',
        statusCode: 400,
      });
    }
    this.buffer = new Array<number>(capacity);
  }

  push(value: number): void {
    this.buffer[this.index] = value;
    this.index = (this.index + 1) % this.capacity;
    if (this.index === 0) this.filled = true;
  }

  latest(): number | null {
    if (!this.filled && this.index === 0) return null;
    const lastIndex =
      this.index === 0 ? this.capacity - 1 : this.index - 1;
    const value = this.buffer[lastIndex];
    return value === undefined ? null : value;
  }

  toArray(): number[] {
    if (!this.filled) {
      return this.buffer.slice(0, this.index);
    }
    return [
      ...this.buffer.slice(this.index),
      ...this.buffer.slice(0, this.index),
    ];
  }

  size(): number {
    return this.filled ? this.capacity : this.index;
  }
}

// --- Global state ---
const metricBufferSize = (): number => {
  const env = process.env.METRIC_BUFFER_SIZE;
  const parsed = env ? Number.parseInt(env, 10) : 1000;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
};

const metricPrefix = (): string => {
  return process.env.METRIC_PREFIX ?? 'aegis_';
};

const metricBuffers = new Map<string, RingBuffer>();
const metricInstances = new Map<string, Histogram | Gauge | Counter>();
const labelCache = new Map<string, string[]>();

interface RecordOptions {
  tags?: Record<string, string>;
}

/**
 * README: "recordCustomMetric(name, value, options?) → Serbest metrik kaydı.
 * Label set'i cache'lenir."
 * README: "Aynı metric + farklı label key → AppError"
 */
export function recordCustomMetric(
  name: string,
  value: number,
  options?: RecordOptions
): void {
  if (!name || typeof name !== 'string') {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'Metric name must be a non-empty string',
      statusCode: 400,
    });
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: `Metric value must be a finite number for "${name}"`,
      statusCode: 400,
    });
  }

  const normalizedName = normalizeMetricName(name, metricPrefix());
  const tags = options?.tags ?? {};
  const newKeys = Object.keys(tags).sort();

  const existingKeys = labelCache.get(normalizedName);
  if (existingKeys) {
    validateLabelSet(normalizedName, existingKeys, newKeys);
  } else {
    labelCache.set(normalizedName, newKeys);
  }

  const buffer = getOrCreateCacheEntry(
    metricBuffers,
    normalizedName,
    () => new RingBuffer(metricBufferSize())
  );
  buffer.push(value);
}

/**
 * README: "recordHistogram(name, value) → Histogram metrik kaydı"
 */
export function recordHistogram(name: string, value: number): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: `Histogram value must be a finite number for "${name}"`,
      statusCode: 400,
    });
  }

  const normalizedName = normalizeMetricName(name, metricPrefix());
  const histogram = getOrCreateCacheEntry(
    metricInstances,
    normalizedName,
    () =>
      new Histogram({
        name: normalizedName,
        help: `Histogram for ${normalizedName}`,
        registers: [register],
      })
  ) as Histogram;

  histogram.observe(value);
}

/**
 * README: "recordGauge(name, value) → Anlık değer (artıp azalan) metrik"
 */
export function recordGauge(name: string, value: number): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: `Gauge value must be a finite number for "${name}"`,
      statusCode: 400,
    });
  }

  const normalizedName = normalizeMetricName(name, metricPrefix());
  const gauge = getOrCreateCacheEntry(
    metricInstances,
    normalizedName,
    () =>
      new Gauge({
        name: normalizedName,
        help: `Gauge for ${normalizedName}`,
        registers: [register],
      })
  ) as Gauge;

  gauge.set(value);
}

/**
 * README: "recordCounter(name, increment?) → Sayaç (sadece artan) metrik"
 * Default increment = 1
 */
export function recordCounter(name: string, increment = 1): void {
  if (typeof increment !== 'number' || !Number.isFinite(increment) || increment < 0) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: `Counter increment must be a non-negative finite number for "${name}"`,
      statusCode: 400,
    });
  }

  const normalizedName = normalizeMetricName(name, metricPrefix());
  const counter = getOrCreateCacheEntry(
    metricInstances,
    normalizedName,
    () =>
      new Counter({
        name: normalizedName,
        help: `Counter for ${normalizedName}`,
        registers: [register],
      })
  ) as Counter;

  counter.inc(increment);
}

/**
 * README: "getMetricValue(name) → Anlık metrik değerini okur (local buffer'dan).
 * Dönüş: Promise<number | null>. Yoksa null döner (hata fırlatmaz)."
 */
export async function getMetricValue(name: string): Promise<number | null> {
  const normalizedName = normalizeMetricName(name, metricPrefix());
  const buffer = metricBuffers.get(normalizedName);
  if (!buffer) {
    logger.debug('getMetricValue: metric not found in buffer', { name });
    return null;
  }
  return buffer.latest();
}

/**
 * Internal: Returns buffered values for anomaly detection.
 * Not exported via public API (used by anomaly-detector).
 */
export function _getMetricBufferValues(name: string): number[] {
  const normalizedName = normalizeMetricName(name, metricPrefix());
  const buffer = metricBuffers.get(normalizedName);
  return buffer ? buffer.toArray() : [];
}