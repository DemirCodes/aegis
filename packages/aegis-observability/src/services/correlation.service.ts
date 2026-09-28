// ============================================================
// services/correlation.service.ts
// ============================================================

import { getAuditLogByCorrelationId } from '@aegis/audit';
import type { AuditLog } from '@aegis/audit';
import { createLogger } from '@aegis/core';
import type { CorrelatedData } from '../types/log.types';
import type { Span } from '../types/trace.types';
import type { LogEntry } from '../types/log.types';
import { getTraceDetails } from './trace.service';
import { searchLogs } from './logging.service';

const logger = createLogger('aegis-observability:correlation-service');

/**
 * README: observabilityService.correlateTraceWithLogs → CorrelatedData
 */
export async function correlateTraceWithLogs(
  traceId: string
): Promise<CorrelatedData> {
  const [details, logsResult, auditLogs] = await Promise.all([
    getTraceDetails(traceId),
    searchLogs(traceId, { limit: 1000 }).catch(() => ({
      total: 0,
      logs: [] as LogEntry[],
      took: 0,
    })),
    getAuditLogByCorrelationId(traceId).catch(() => [] as AuditLog[]),
  ]);

  logger.debug('Correlated trace data', {
    traceId,
    spanCount: details.spans.length,
    logCount: logsResult.logs.length,
    auditCount: auditLogs.length,
  });

  const correlatedEvents = details.spans.map((span: Span) => ({
    span,
    logs: logsResult.logs.filter((l) => l.traceId === traceId),
  }));

  return {
    traceId,
    spans: details.spans,
    logs: logsResult.logs,
    correlatedEvents,
  };
}