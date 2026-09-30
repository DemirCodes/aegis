// ============================================================
// config.ts
// ============================================================

import { createLogger, AppError, ErrorCodes } from '@aegis/core';
import { initializeOTelExporter } from './exporters';

const logger = createLogger('aegis-observability:config');

/**
 * README: initObservability(config?) parametreleri
 * Değişiklik Kaydı #10: enableOtel=true → OTel SDK otomatik başlar.
 */
export interface ObservabilityConfig {
  serviceName: string;
  metricPrefix: string;
  enableOtel: boolean;
  enableElasticsearch: boolean;
  enablePrometheus: boolean;
  metricBufferSize: number;
  retryCount: number;
}

let isInitialized = false;
let currentConfig: ObservabilityConfig | null = null;

/**
 * Safe integer reader.
 * Invalid value → AppError(VALIDATION_ERROR).
 */
function readInt(
  raw: string | undefined,
  fallback: number,
  envKey: string
): number {
  if (raw === undefined || raw === '') return fallback;

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed)) {
    throw new AppError({
      code: ErrorCodes.VALIDATION_ERROR,
      message: `Invalid integer value for env "${envKey}": "${raw}"`,
      statusCode: 422,
      details: { envKey, raw, expected: 'integer' },
    });
  }

  return parsed;
}

function envDefaults(): ObservabilityConfig {
  return {
    serviceName: process.env.SERVICE_NAME ?? 'aegis-service',
    metricPrefix: process.env.METRIC_PREFIX ?? 'aegis_',
    enableOtel: process.env.OTEL_ENABLED === 'true',
    enableElasticsearch: process.env.ELASTICSEARCH_ENABLED === 'true',
    enablePrometheus: true,
    metricBufferSize: readInt(
      process.env.METRIC_BUFFER_SIZE,
      1000,
      'METRIC_BUFFER_SIZE'
    ),
    retryCount: readInt(
      process.env.RETRY_COUNT,
      3,
      'RETRY_COUNT'
    ),
  };
}

/**
 * README: "initObservability(config?) → Observability modülünü başlatır.
 * Env değişkenleri default, config override eder."
 * README: "İkinci çağrı: logger.warn + ignore"
 *
 * Değişiklik Kaydı #10: enableOtel=true ise initializeOTelExporter
 * otomatik çağrılır (Kural 10: Güvenli + Kullanışlı).
 */
export function initObservability(
  config?: Partial<ObservabilityConfig>
): void {
  if (isInitialized) {
    logger.warn('initObservability() already called, ignoring duplicate call');
    return;
  }

  // Re-entrancy protection: set flag first
  isInitialized = true;

  try {
    const defaults = envDefaults();
    currentConfig = {
      ...defaults,
      ...(config ?? {}),
    };

    // Değişiklik Kaydı #10: OTel SDK otomatik başlat
    if (currentConfig.enableOtel) {
      initializeOTelExporter({
        serviceName: currentConfig.serviceName,
        endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      });
    }

    logger.info('Observability initialized', {
      serviceName: currentConfig.serviceName,
      metricPrefix: currentConfig.metricPrefix,
      enableOtel: currentConfig.enableOtel,
      enableElasticsearch: currentConfig.enableElasticsearch,
      enablePrometheus: currentConfig.enablePrometheus,
    });
  } catch (err) {
    // Rollback on failure → allow retry
    isInitialized = false;
    currentConfig = null;

    if (err instanceof AppError) {
      logger.error('Observability initialization failed', err, {
        code: err.code,
        message: err.message,
        severity: err.severity,
        details: err.details,
      });
      throw err;
    }

    const wrapped = new AppError({
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Observability initialization failed',
      statusCode: 500,
      details: {
        cause: err instanceof Error ? err.message : String(err),
      },
      isOperational: false,
    });

    logger.error('Observability initialization failed', wrapped, {
      code: wrapped.code,
      message: wrapped.message,
      severity: wrapped.severity,
    });

    throw wrapped;
  }
}

/**
 * README: "initObservability() çağrılmadıysa → ilk fonksiyon çağrısında
 * otomatik init yapılır. Logger warn: 'initObservability() not called,
 * using lazy init with env defaults'"
 */
export function getObservabilityConfig(): ObservabilityConfig {
  if (!currentConfig) {
    logger.warn(
      'initObservability() not called, using lazy init with env defaults'
    );
    initObservability();
  }
  return currentConfig as ObservabilityConfig;
}