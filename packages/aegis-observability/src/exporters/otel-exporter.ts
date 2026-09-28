
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor, SimpleSpanProcessor, InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { GrpcInstrumentation } from '@opentelemetry/instrumentation-grpc';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis';
import { createLogger } from '@aegis/core';

const logger = createLogger('aegis-observability:otel-exporter');
let isOtelInitialized = false;

/**
 * README: "Trace detayları → OTel in-memory store"
 * Değişiklik Kaydı #3: memoryExporter export edildi.
 * trace.service.ts bu exporter'ın getFinishedSpans() metodundan okur.
 */
export const memoryExporter = new InMemorySpanExporter();

/**
 * README: "initializeOTelExporter(config?) → OpenTelemetry exporter'ı başlatır"
 * README: "OTEL_ENABLED=false ise → no-op"
 * README: "İkinci çağrı: warn + ignore"
 */
export function initializeOTelExporter(config?: {
  serviceName?: string;
  endpoint?: string;
}): void {
  const enabled = process.env.OTEL_ENABLED === 'true';

  if (!enabled) {
    logger.debug('OTel disabled, skipping initialization');
    return;
  }

  if (isOtelInitialized) {
    logger.warn('initializeOTelExporter() already called, ignoring duplicate call');
    return;
  }

  const serviceName =
    config?.serviceName ?? process.env.SERVICE_NAME ?? 'aegis-service';
  const endpoint =
    config?.endpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
  });

  // OTLP exporter (dışa gönderim)
  provider.addSpanProcessor(
    new BatchSpanProcessor(new OTLPTraceExporter({ url: endpoint }))
  );

  // In-memory exporter (trace.service.ts için)
  provider.addSpanProcessor(new SimpleSpanProcessor(memoryExporter));

  provider.register();

  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new GrpcInstrumentation(),
      new PgInstrumentation(),
      new RedisInstrumentation(),
    ],
  });

  isOtelInitialized = true;
  logger.info('OTel exporter initialized', { serviceName, endpoint });
}