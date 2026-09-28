// ============================================================
// services/logging.service.ts
// ============================================================

import { Client } from '@elastic/elasticsearch';
import { createLogger } from '@aegis/core';
import type {
  LogSearchResult,
  LogStats,
  LogEntry,
  LogLevel,
} from '../types/log.types';

const logger = createLogger('aegis-observability:logging-service');

const INDEX_PREFIX = process.env.ELASTICSEARCH_INDEX_PREFIX ?? 'aegis-logs';

interface SearchOptions {
  level?: LogLevel;
  service?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

interface StatsFilters {
  startDate?: Date;
  endDate?: Date;
  service?: string;
}

// Singleton ES client
let esClient: Client | null = null;

function getClient(): Client {
  if (!esClient) {
    esClient = new Client({
      node: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
    });
  }
  return esClient;
}

function isEnabled(): boolean {
  return process.env.ELASTICSEARCH_ENABLED === 'true';
}

/**
 * README: searchLogs(query, options?) → LogSearchResult
 * ELASTICSEARCH_ENABLED=false → uyarı log + boş sonuç döner
 */
export async function searchLogs(
  query: string,
  options?: SearchOptions
): Promise<LogSearchResult> {
  if (!isEnabled()) {
    logger.warn('Elasticsearch disabled, returning empty log search result');
    return { total: 0, logs: [], took: 0 };
  }

  const limit = options?.limit ?? 100;
  const must: any[] = [{ multi_match: { query, fields: ['message'] } }];

  if (options?.level) must.push({ term: { level: options.level } });
  if (options?.service) must.push({ term: { service: options.service } });
  if (options?.startDate || options?.endDate) {
    must.push({
      range: {
        timestamp: {
          ...(options.startDate && { gte: options.startDate.toISOString() }),
          ...(options.endDate && { lte: options.endDate.toISOString() }),
        },
      },
    });
  }

  const response = await getClient().search({
    index: `${INDEX_PREFIX}-*`,
    size: limit,
    query: { bool: { must } },
  });

  const hits = response.hits.hits;
  return {
    total:
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0,
    logs: hits.map((h) => h._source as LogEntry),
    took: response.took,
  };
}

/**
 * README: getLogStats(filters?) → LogStats
 * ELASTICSEARCH_ENABLED=false → uyarı log + boş sonuç döner
 */
export async function getLogStats(
  filters?: StatsFilters
): Promise<LogStats> {
  if (!isEnabled()) {
    logger.warn('Elasticsearch disabled, returning empty log stats');
    return { totalLogs: 0, byLevel: {}, byService: {}, errorRate: 0 };
  }

  const must: any[] = [];
  if (filters?.service) must.push({ term: { service: filters.service } });
  if (filters?.startDate || filters?.endDate) {
    must.push({
      range: {
        timestamp: {
          ...(filters.startDate && { gte: filters.startDate.toISOString() }),
          ...(filters.endDate && { lte: filters.endDate.toISOString() }),
        },
      },
    });
  }

  const response = await getClient().search({
    index: `${INDEX_PREFIX}-*`,
    size: 0,
    query: { bool: { must } },
    aggs: {
      by_level: { terms: { field: 'level' } },
      by_service: { terms: { field: 'service' } },
      errors: { filter: { term: { level: 'error' } } },
    },
  });

  const aggs = response.aggregations as any;
  const totalLogs =
    typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value ?? 0;

  const byLevel: Record<string, number> = {};
  for (const b of aggs?.by_level?.buckets ?? []) {
    byLevel[b.key] = b.doc_count;
  }

  const byService: Record<string, number> = {};
  for (const b of aggs?.by_service?.buckets ?? []) {
    byService[b.key] = b.doc_count;
  }

  const errorCount = aggs?.errors?.doc_count ?? 0;
  const errorRate = totalLogs > 0 ? (errorCount / totalLogs) * 100 : 0;

  return { totalLogs, byLevel, byService, errorRate };
}
