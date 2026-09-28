// ============================================================
// middleware/metrics.middleware.ts
// ============================================================

import type { RequestHandler } from 'express';
import { Histogram, Counter, register } from 'prom-client';

/**
 * README: "aegis_http_request_duration_seconds (histogram)"
 */
const httpRequestDuration = new Histogram({
  name: 'aegis_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

/**
 * README: "aegis_http_requests_total (counter)"
 */
const httpRequestsTotal = new Counter({
  name: 'aegis_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

/**
 * README: "aegis_http_errors_total (counter)"
 */
const httpErrorsTotal = new Counter({
  name: 'aegis_http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

/**
 * README: "metricsMiddleware() → HTTP metriklerini otomatik toplar
 * (latency, error rate, throughput)."
 */
export function metricsMiddleware(): RequestHandler {
  return (req, res, next) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const durationNs = Number(process.hrtime.bigint() - start);
      const durationSec = durationNs / 1e9;
      const route = req.route?.path || 'unknown';
      const labels = {
        method: req.method,
        route,
        status_code: String(res.statusCode),
      };

      httpRequestDuration.observe(labels, durationSec);
      httpRequestsTotal.inc(labels);

      if (res.statusCode >= 400) {
        httpErrorsTotal.inc(labels);
      }
    });

    next();
  };
}