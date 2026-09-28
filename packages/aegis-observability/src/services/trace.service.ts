// ============================================================
// services/trace.service.ts (DÜZELTİLDİ)
// ============================================================

import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { SpanStatusCode } from '@opentelemetry/api';
import { AppError, createLogger } from '@aegis/core';
import type {
  Span,
  TraceDetails,
  TraceTree,
  SlowTrace,
  FailedTrace,
} from '../types/trace.types';
import { memoryExporter } from '../exporters/otel-exporter';

const logger = createLogger('aegis-observability:trace-service');

const MAX_SPANS_IN_MEMORY = (() => {
  const env = process.env.MAX_SPANS_IN_MEMORY;
  const parsed = env ? Number.parseInt(env, 10) : 5000;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5000;
})();

/**
 * Prunes the in-memory span store when it exceeds the cap.
 * Prevents OOM in long-running processes.
 * Değişiklik Kaydı #4
 */
export function pruneOldSpans(): void {
  const spans = memoryExporter.getFinishedSpans();
  if (spans.length > MAX_SPANS_IN_MEMORY) {
    logger.warn('Pruning in-memory span store', {
      current: spans.length,
      max: MAX_SPANS_IN_MEMORY,
    });
    memoryExporter.reset();
  }
}

function hrTimeToMs(hrTime: [number, number]): number {
  return hrTime[0] * 1000 + hrTime[1] / 1_000_000;
}

/**
 * Converts OTel ReadableSpan into the internal Span type.
 * Değişiklik Kaydı #2: parentSpanId eklendi.
 * observability.service.ts tarafından da kullanılır (getDependencyGraph).
 */
export function toInternalSpan(readable: ReadableSpan): Span {
  const ctx = readable.spanContext();
  return {
    spanId: ctx.spanId,
    traceId: ctx.traceId,
    parentSpanId: readable.parentSpanId,
    operationName: readable.name,
    duration: hrTimeToMs(readable.duration),
    status: readable.status.code === SpanStatusCode.ERROR ? 'error' : 'ok',
    tags: readable.attributes as Record<string, any>,
    logs: readable.events.map((e) => ({
      timestamp: new Date(hrTimeToMs([e.time[0], e.time[1]])),
      fields: e.attributes as Record<string, any>,
    })),
    startTime: new Date(hrTimeToMs(readable.startTime)),
    endTime: new Date(hrTimeToMs(readable.endTime)),
  };
}

/**
 * README: observabilityService.getTraceDetails → TraceDetails
 */
export async function getTraceDetails(traceId: string): Promise<TraceDetails> {
  const spans: Span[] = memoryExporter
    .getFinishedSpans()
    .filter((s: ReadableSpan) => s.spanContext().traceId === traceId)
    .map((s: ReadableSpan) => toInternalSpan(s));

  if (spans.length === 0) {
    throw new AppError({
      code: 'NOT_FOUND',
      message: `Trace not found: ${traceId}`,
      statusCode: 404,
    });
  }

  const duration = Math.max(...spans.map((s) => s.duration));
  const hasError = spans.some((s) => s.status === 'error');
  const serviceCalls = spans.map((s) => ({
    serviceName: (s.tags['service.name'] as string) ?? 'unknown',
    operationName: s.operationName,
    duration: s.duration,
    status: s.status,
  }));

  return {
    traceId,
    spans,
    duration,
    status: hasError ? 'error' : 'success',
    serviceCalls,
    timestamp: new Date(),
  };
}

/**
 * README: observabilityService.getTraceTree → TraceTree
 */
export async function getTraceTree(traceId: string): Promise<TraceTree> {
  const details = await getTraceDetails(traceId);
  return buildTraceTree(details.spans);
}

/**
 * Internal helper: builds a hierarchical tree from flat spans.
 */
export function buildTraceTree(spans: Span[]): TraceTree {
  if (spans.length === 0) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'Cannot build trace tree from empty span list',
      statusCode: 400,
    });
  }

  const byId = new Map<string, Span>();
  for (const s of spans) byId.set(s.spanId, s);

  const childrenOf = new Map<string | undefined, Span[]>();
  for (const s of spans) {
    const list = childrenOf.get(s.parentSpanId) ?? [];
    list.push(s);
    childrenOf.set(s.parentSpanId, list);
  }

  const root = spans.find((s) => !s.parentSpanId || !byId.has(s.parentSpanId));
  if (!root) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'Trace tree has no root span',
      statusCode: 400,
    });
  }

  const build = (span: Span): TraceTree => {
    const children = childrenOf.get(span.spanId) ?? [];
    return {
      traceId: span.traceId,
      rootSpan: span,
      children: children.map(build),
    };
  };

  return build(root);
}

/**
 * README: observabilityService.getSlowTraces → SlowTrace[]
 */
export async function getSlowTraces(
  threshold = 1000,
  limit = 100
): Promise<SlowTrace[]> {
  return memoryExporter
    .getFinishedSpans()
    .map((s: ReadableSpan) => toInternalSpan(s))
    .filter((s) => s.duration > threshold)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit)
    .map((s) => ({
      traceId: s.traceId,
      duration: s.duration,
      operationName: s.operationName,
      timestamp: s.startTime,
    }));
}

/**
 * README: observabilityService.getFailedTraces → FailedTrace[]
 */
export async function getFailedTraces(limit = 100): Promise<FailedTrace[]> {
  return memoryExporter
    .getFinishedSpans()
    .map((s: ReadableSpan) => toInternalSpan(s))
    .filter((s) => s.status === 'error')
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    .slice(0, limit)
    .map((s) => ({
      traceId: s.traceId,
      error: (s.tags['error.message'] as string) ?? 'Unknown error',
      duration: s.duration,
      timestamp: s.startTime,
    }));
}