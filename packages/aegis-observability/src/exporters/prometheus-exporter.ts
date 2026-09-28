// ============================================================
// exporters/prometheus-exporter.ts
// ============================================================

import type { RequestHandler } from 'express';
import { register } from 'prom-client';

/**
 * README: "prometheusExporter() → Prometheus'un çekebileceği /metrics endpoint'i sağlar"
 * README: "prom-client registry'sindeki tüm metrikleri döner"
 * README: "Content-Type: text/plain; version=0.0.4"
 */
export function prometheusExporter(): RequestHandler {
  return async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  };
}
