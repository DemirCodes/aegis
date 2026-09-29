


import { createLogger, AppError } from '@aegis/core';
import { initializeOTelExporter } from './src/exporters';
import { env } from 'process';
import { METRIC_HW_NETWORK_UP } from '@opentelemetry/semantic-conventions/incubating';
import { getEnabledCategories } from 'trace_events';

const logger = createLogger('aegis-observability:config');



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
let currentConfig: ObservabilityConfig | null = null; // Eğer özel yapılandırma yapılmazsa default sysEng kullanır.

function envDefaults(): ObservabilityConfig {
  return {
    serviceName: process.env.SERVICE_NAME ?? 'aegis-service',
    metricPrefix: process.env.METRIC_PREFIX ?? 'aegis_', // yapılandırılacak sonradan
    enableOtel: process.env.OTEL_ENABLED === 'true',
    enableElasticsearch: process.env.ELASTICSEARCH_ENABLED === 'true',
    enablePrometheus: true,
    metricBufferSize: Number.parseInt(process.env.METRIC_BUFFER_SIZE ?? '1000', 10) || 1000, // metricler max 1000 degerını alabilir aksini almaya calısırsa cluster down
    retryCount: Number.parseInt(process.env.RETRY_COUNT ?? '3', 10) || 3, // tekrar sayısı max 3
  };
}

export function initObservability(config?: Partial<ObservabilityConfig>): void {
  if (isInitialized) {
    logger.warn('initObservability() already called, ingoring duplicate call , arama sana birader daha fazla');
    return;
  }

  const defaults = envDefaults();
  currentConfig = {
    ...defaults,
    ...(config ?? {}),
  };

  if (currentConfig?.enableOtel) {
    initializeOTelExporter({
      serviceName: currentConfig.serviceName,
      endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    });
  }

  isInitialized = true;
  logger.info('Observability Initialized', {
    serviceName: currentConfig.serviceName,
    metricPrefix: currentConfig?.metricPrefix,
    enableOtel: currentConfig?.enableOtel,
    enableElasticsearch: currentConfig?.enableElasticsearch,
    enablePrometheus: currentConfig?.enablePrometheus,
  });
}


export function getObservabiltyConfig(): ObservabilityConfig {
  if (!currentConfig) {
    logger.warn(
      'initObservability() not called, using lazy init with env default' // lütfen bağlantı sağlanmadıysa kardeş .env yi kullanarak baglan
    );
    initObservability();
  }
  return currentConfig as ObservabilityConfig;
}


