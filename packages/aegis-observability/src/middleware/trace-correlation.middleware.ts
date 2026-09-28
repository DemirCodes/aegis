// ============================================================
// middleware/trace-correlation.middleware.ts
// ============================================================

import { AsyncLocalStorage } from 'async_hooks';
import type { RequestHandler } from 'express';
import { generateId } from '@aegis/core';

/**
 * Async context storage for trace ID propagation.
 */
export interface TraceContext {
  traceId: string;
}

const traceStorage = new AsyncLocalStorage<TraceContext>();

/**
 * README: "traceCorrelationMiddleware() → Her isteğe trace-id enjekte eder.
 * Loglara, downstream call'lara ve response header'larına ekler."
 *
 * Davranış (README):
 * - Request'te X-Trace-Id header'ı varsa → kullanır
 * - Yoksa → core.generateId() ile üretir
 * - Response'a X-Trace-Id header'ı ekler
 */
export function traceCorrelationMiddleware(): RequestHandler {
  return (req, res, next) => {
    const incoming = req.headers['x-trace-id'];
    const traceId =
      typeof incoming === 'string' && incoming.length > 0
        ? incoming
        : generateId();

    res.setHeader('X-Trace-Id', traceId);

    traceStorage.run({ traceId }, () => {
      next();
    });
  };
}

/**
 * AsyncLocalStorage'dan mevcut trace context'i döner.
 * Downstream çağrılarda trace ID erişimi için.
 */
export function getTraceContext(): TraceContext | undefined {
  return traceStorage.getStore();
}