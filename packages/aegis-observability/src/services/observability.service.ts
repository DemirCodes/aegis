// ============================================================
// services/observability.service.ts (DÜZELTİLDİ)
// ============================================================

import { createLogger, AppError, retry } from '@aegis/core';
import { memoryExporter } from '../exporters/otel-exporter';
import { toInternalSpan , pruneOldSpans } from './trace.service';
import type { Span } from '../types/trace.types';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';

import type {
  PerformanceReport,
  HealthStatus,
  ErrorRateMetrics,
  LatencyPercentiles,
  SystemOverview,
  EndpointMetric,
} from '../types/report.types';
import type { MetricResult, PrometheusQuery } from '../types/prometheus.types';
import type { TimeWindow } from '../types/metrics.types';
import {
  getTraceDetails,
  getTraceTree,
  getSlowTraces,
  getFailedTraces,
} from './trace.service';
import { correlateTraceWithLogs } from './correlation.service';
import type { DependencyGraph } from '../types/trace.types';
import { METRIC_NODEJS_EVENTLOOP_DELAY_P99 } from '@opentelemetry/semantic-conventions/incubating';

const logger = createLogger('aegis-observability:observability-service');

const PROMETHEUS_URL = (): string | undefined => process.env.PROMETHEUS_URL;

async function promQuery(query: PrometheusQuery): Promise<MetricResult> {
  const url = PROMETHEUS_URL();
  if (!url) {
    throw new AppError({
      code: 'INTERNAL_ERROR',
      message: 'PROMETHEUS_URL is not configured',
      statusCode: 500,
    });
  }

  const endpoint = `${url}/api/v1/query?query=${encodeURIComponent(query.expression)}`;
  const data = await retry(async () => {
    const res = await fetch(endpoint);
    if (!res.ok) {
      throw new AppError({
        code: 'EXTERNAL_API_FAILED',
        message: `Prometheus query failed: ${res.status}`,
        statusCode: 502,
      });
    }
    return res.json() as Promise<any>;
  });

  const result = data?.data?.result?.[0];
  if (!result) {
    return { metric: {}, value: [], timestamps: [] };
  }

  return {
    metric: result.metric ?? {},
    value: [Number(result.value?.[1] ?? 0)],
    timestamps: [new Date(Number(result.value?.[0] ?? 0) * 1000)],
  };
}

function windowToSeconds(w: TimeWindow): number {
  if (w === 'hour') return 3600;
  if (w === 'day') return 86400;
  return 604800;
}


function expressionQuery(expression: string): PrometheusQuery {
  const now = new Date();
  return {
    expression,
    start: new Date(now.getTime() - 5 * 60 * 1000),
    end: now,
    step: '15s',
  };
}




/**
 * README: observabilityService.getServiceHealthStatus → HealthStatus
 * Değişiklik Kaydı #5: @aegis/resilience henüz yazılmadı.
 * TODO: @aegis/resilience hazır olunca getAllHealthStatus() entegre edilecek.
 */
async function getServiceHealthStatus(): Promise<HealthStatus> {
  // TODO: @aegis/resilience hazır olunca:
  //   const checks = await getAllHealthStatus();
  //   ... (mevcut aggregation logic)

  return {
    status: 'healthy',
    // NOT: process uptime, SLA-based uptime değil — ileride yanlış anlaşılmasın.
    uptime: process.uptime(),
    errorRate: 0,
    lastCheck: new Date(),
  };
}

/**
 * README: observabilityService.getErrorRateByEndpoint → ErrorRateMetrics[]
 */
async function getErrorRateByEndpoint(options?: {
  timeWindow?: TimeWindow;
  threshold?: number;
}): Promise<ErrorRateMetrics[]> {
  const w = options?.timeWindow ?? 'hour';
  const threshold = options?.threshold ?? 0;
  const range = `${windowToSeconds(w)}s`;

  const result = await promQuery(
    expressionQuery(
      `sum by (method ,route) (rate(aegis_http_errors_total[${range})) /` +
      `sum by (method ,route) (rate(aegis_http_requests_total[${range}])) * 100 `
    )
  );

  if (result.value.length === 0) return [];

  const rate = result.value[0];
  if (rate < threshold) return [];

  return [
    {
      endpoint: result.metric.route ?? 'unknown',
      method: result.metric.method ?? 'UNKNOWN',
      errorRate: rate,
      errorCount: 0,
      totalRequests: 0,
    },
  ];
}

/**
 * README: observabilityService.getLatencyPercentiles → LatencyPercentiles
 */
async function getLatencyPercentiles(
  endpoint: string
): Promise<LatencyPercentiles> {
  const queries = ['0.50', '0.75', '0.95', '0.99'].map((q) =>
    promQuery
      (
        expressionQuery(
          `histogram_quantile(${q}, rate(aegis_http_request_duration_seconds_bucket{route="${endpoint}"}[5m]))`
        )
      )
  );
  const maxQuery = promQuery
    (
      expressionQuery(
        `max(aegis_http_request_duration_seconds_bucket{route="${endpoint}"})`
      )
    );

  const [p50, p75, p95, p99, max] = await Promise.all([...queries, maxQuery]);

  return {
    endpoint,
    p50: p50.value[0] ?? 0,
    p75: p75.value[0] ?? 0,
    p95: p95.value[0] ?? 0,
    p99: p99.value[0] ?? 0,
    max: max.value[0] ?? 0,
  };
}

/**
 * README: observabilityService.customMetricQuery → MetricResult
 */
async function customMetricQuery(promql: string): Promise<MetricResult> {
  return promQuery(expressionQuery(promql));
}

/**
 * README: observabilityService.getSystemOverview → SystemOverview
 */
async function getSystemOverview(): Promise<SystemOverview> {
  const [health, errorRates] = await Promise.all([
    getServiceHealthStatus(),
    getErrorRateByEndpoint(),
  ]);

  return {
    totalServices: 1,
    healthyServices: health.status === 'healthy' ? 1 : 0,
    degradedServices: health.status === 'degraded' ? 1 : 0,
    unhealthyServices: health.status === 'unhealthy' ? 1 : 0,
    totalRequests: 0,
    avgLatency: 0,
    errorRate:
      errorRates.length > 0
        ? errorRates.reduce((sum, e) => sum + e.errorRate, 0) /
        errorRates.length
        : health.errorRate,
    timestamp: new Date(),
  };
}

/**
 * README: observabilityService.generatePerformanceReport → PerformanceReport
 * Veri Kaynakları: Prometheus HTTP API (latency/error/throughput)
 */
async function generatePerformanceReport(
  startDate: Date,
  endDate: Date
): Promise<PerformanceReport> {
  const range = `${Math.floor((endDate.getTime() - startDate.getTime()) / 1000)}s`;

  const [avg, p95, p99, rate, total, slowEndpoints, errorEndpoints] =
    await Promise.all([
      promQuery(
        expressionQuery(
          (`avg(rate(aegis_http_request_duration_seconds_sum[${range}]))`),
        )
      ),
      promQuery
        (
          expressionQuery(


            `histogram_quantile(0.95, rate(aegis_http_request_duration_seconds_bucket[${range}]))`
          )),
      promQuery
        (
          expressionQuery(
            `histogram_quantile(0.99, rate(aegis_http_request_duration_seconds_bucket[${range}]))`
          )),
      promQuery
        (
          expressionQuery(
            `rate(aegis_http_errors_total[${range}]) / rate(aegis_http_requests_total[${range}])`
          )),
      promQuery(expressionQuery(`sum(rate(aegis_http_requests_total[${range}]))`)),
      promQuery(
        expressionQuery(
          `topk(10, avg by (route, method) (rate(aegis_http_request_duration_seconds_sum[${range}])))`
        )),
      promQuery(
        expressionQuery(


          `topk(10, sum by (route, method) (rate(aegis_http_errors_total[${range}])))`
        )),
    ]);

  const toEndpointMetric = (m: MetricResult): EndpointMetric => ({
    endpoint: m.metric.route ?? 'unknown',
    method: m.metric.method ?? 'UNKNOWN',
    avgLatency: m.value[0],
  });

  return {
    period: { start: startDate, end: endDate },
    avgLatency: avg.value[0] ?? 0,
    p95Latency: p95.value[0] ?? 0,
    p99Latency: p99.value[0] ?? 0,
    errorRate: rate.value[0] ?? 0,
    throughput: total.value[0] ?? 0,
    topSlowEndpoints: slowEndpoints.metric.route
      ? [toEndpointMetric(slowEndpoints)]
      : [],
    topErrorEndpoints: errorEndpoints.metric.route
      ? [
        {
          ...toEndpointMetric(errorEndpoints),
          errorRate: errorEndpoints.value[0],
        },
      ]
      : [],
  };
}

/**
 * README: observabilityService.getDependencyGraph → DependencyGraph
 * Kaynak: OTel span parent-child ilişkileri (memoryExporter).
 */
interface DependencyNode {
  serviceName: string;
  type: 'service' | 'database' | 'external';
}

interface DependencyEdge {
  from: string;
  to: string;
  callCount: number;
}

function classifySpanType(span: Span): DependencyNode['type'] {
  if (span.tags['db.system'] || span.tags['db.type']) return 'database';
  if (span.tags['http.url'] || span.tags['rpc.service']) return 'external';
  return 'service';
}


async function getDependencyGraph(): Promise<DependencyGraph> {
  pruneOldSpans();   // ← EKLE
  const spans: Span[] = memoryExporter
    .getFinishedSpans()
    .map((s: ReadableSpan) => toInternalSpan(s));

  const byId = new Map<string, Span>();
  for (const s of spans) byId.set(s.spanId, s);

  const nodes = new Map<string, DependencyNode>();
  const edges = new Map<string, DependencyEdge>();

  const serviceOf = (span: Span): string =>
    (span.tags['service.name'] as string) ?? span.operationName;

  for (const span of spans) {
    const selfName = serviceOf(span);
    if (!nodes.has(selfName)) {
      nodes.set(selfName, {
        serviceName: selfName,
        type: classifySpanType(span),
      });
    }

    if (span.parentSpanId) {
      const parent = byId.get(span.parentSpanId);
      if (parent) {
        const parentName = serviceOf(parent);
        if (parentName === selfName) continue;

        const key = `${parentName}->${selfName}`;
        const existing = edges.get(key);
        if (existing) existing.callCount += 1;
        else
          edges.set(key, {
            from: parentName,
            to: selfName,
            callCount: 1,
          });
      }
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
  };
}

/**
 * README: observabilityService.* (singleton)
 * README: "correlateTraceWithLogs sadece observabilityService üzerinden erişilir.
 * Standalone export YOK."
 */
export const observabilityService = {
  getTraceDetails,
  getTraceTree,
  getSlowTraces,
  getFailedTraces,
  correlateTraceWithLogs,
  generatePerformanceReport,
  getServiceHealthStatus,
  getErrorRateByEndpoint,
  getLatencyPercentiles,
  customMetricQuery,
  getSystemOverview,
  getDependencyGraph,
};
