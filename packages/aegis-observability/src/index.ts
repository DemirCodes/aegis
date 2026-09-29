// ============================================================
// index.ts (ROOT — FINAL)
// ============================================================

// --- Config & Init ---
export { initObservability } from './config';
export type { ObservabilityConfig } from './config';

// --- Middleware ---
export {
  traceCorrelationMiddleware,
  getTraceContext,
} from './middleware/trace-correlation.middleware';
export type { TraceContext } from './middleware/trace-correlation.middleware';
export { metricsMiddleware } from './middleware/metrics.middleware';

// --- Exporters ---
export { prometheusExporter } from './exporters/prometheus-exporter';
export { initializeOTelExporter } from './exporters/otel-exporter';

// --- Metrics: Metric Definitions ---
export {
  recordCustomMetric,
  recordHistogram,
  recordGauge,
  recordCounter,
  getMetricValue,
} from './metrics/metric-definitions';

// --- Metrics: Business Metrics ---
export { businessMetrics } from './metrics/business-metrics';

// --- Metrics: Anomaly Detector ---
export { anomalyDetector } from './metrics/anomaly-detector';

// --- Services: Logging ---
export { searchLogs, getLogStats } from './services/logging.service';

// --- Services: Observability ---
export { observabilityService } from './services/observability.service';

// --- Public Types ---
export type {
  AnomalySeverity,
  HealthStatusLevel,
  TimeWindow,
  LogLevel,
  AlertActionType,
  AnomalyDetectionResult,
  SpikeDetectionResult,
  AnomalyEvent,
  AlertAction,
  AlertRule,
  PaymentMetrics,
  EndpointMetrics,
  DatabaseMetrics,
  ThirdPartyMetrics,
  UserMetrics,
} from './types/metrics.types';

export type {
  Span,
  SpanLog,
  ServiceCall,
  TraceDetails,
  TraceTree,
  SlowTrace,
  FailedTrace,
  DependencyGraph,
} from './types/trace.types';

export type {
  LogEntry,
  CorrelatedData,
  LogSearchResult,
  LogStats,
} from './types/log.types';

export type {
  PerformanceReport,
  EndpointMetric,
  LatencyPercentiles,
  ErrorRateMetrics,
  HealthStatus,
  SystemOverview,
} from './types/report.types';

export type {
  PrometheusQuery,
  MetricResult,
} from './types/prometheus.types';