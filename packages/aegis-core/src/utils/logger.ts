// ============================================
// @aegis/core - Logger (Winston + Elasticsearch)
// ============================================

import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { ElasticsearchTransport } from 'winston-elasticsearch';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LoggerOptions = {
  level?: LogLevel;
  format?: 'json' | 'pretty';
  logDir?: string;
  maxFiles?: number;
  maxSize?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  enableElasticsearch?: boolean;
};

export type Logger = {
  info: (message: string, meta?: any) => void;
  error: (message: string, error?: Error, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
  child: (meta: Record<string, any>) => Logger;
};

const sensitiveKeys = ['password', 'secret', 'token', 'key', 'authorization', 'credit'];

function sanitizeMeta(meta?: any): any {
  if (!meta) return meta;
  if (typeof meta !== 'object') return meta;
  
  const sanitized = { ...meta };
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((k) => lowerKey.includes(k))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}

function createElasticsearchTransport(name: string) {
  const esUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
  const indexPrefix = process.env.ELASTICSEARCH_INDEX_PREFIX || 'aegis-logs';

  try {
    return new ElasticsearchTransport({
      level: 'info',
      clientOpts: { node: esUrl },
      indexPrefix: indexPrefix,
      indexSuffixPattern: 'YYYY.MM.DD',
    });
  } catch (error) {
    console.warn(`[${name}] Elasticsearch transport could not be created`);
    return null;
  }
}

function createTransports(options?: LoggerOptions) {
  const transports: winston.transport[] = [];
  const format = options?.format || 'pretty';
  
  if (options?.enableConsole !== false) {
    transports.push(
      new winston.transports.Console({
        format:
          format === 'json'
            ? winston.format.json()
            : winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
                  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                  return `${timestamp} [${service || 'app'}] ${level}: ${message}${metaStr}`;
                }),
              ),
      }),
    );
  }

  if (options?.enableFile !== false) {
    const logDir = options?.logDir || path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: options?.maxSize ? parseSize(options.maxSize) : 10 * 1024 * 1024,
        maxFiles: options?.maxFiles || 5,
        format: winston.format.json(),
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: options?.maxSize ? parseSize(options.maxSize) : 10 * 1024 * 1024,
        maxFiles: options?.maxFiles || 5,
        format: winston.format.json(),
      }),
    );
  }

  return transports;
}

function parseSize(size: string): number {
  const units: Record<string, number> = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+)\s*(b|kb|mb|gb)?$/);
  if (match) {
    return parseInt(match[1]) * (units[match[2]] || 1);
  }
  return 10 * 1024 * 1024;
}

export function createLogger(name: string, options?: LoggerOptions): Logger {
  const level = options?.level || (process.env.LOG_LEVEL as LogLevel) || 'info';
  const transports = createTransports(options);

  if (options?.enableElasticsearch !== false && 
      (process.env.NODE_ENV === 'production' || process.env.ELASTICSEARCH_ENABLED === 'true')) {
    const esTransport = createElasticsearchTransport(name);
    if (esTransport) {
      transports.push(esTransport);
    }
  }

  const winstonLogger = winston.createLogger({
    level,
    defaultMeta: { service: name },
    transports,
  });

  return {
    info: (message: string, meta?: any) => winstonLogger.info(message, sanitizeMeta(meta)),
    error: (message: string, error?: Error, meta?: any) =>
      winstonLogger.error(message, {
        error: error?.message,
        stack: error?.stack,
        ...sanitizeMeta(meta),
      }),
    warn: (message: string, meta?: any) => winstonLogger.warn(message, sanitizeMeta(meta)),
    debug: (message: string, meta?: any) => winstonLogger.debug(message, sanitizeMeta(meta)),
    child: (meta: Record<string, any>) => {
      const childLogger = winstonLogger.child(meta);
      return {
        info: (message: string, m?: any) => childLogger.info(message, m),
        error: (message: string, error?: Error, m?: any) =>
          childLogger.error(message, { error: error?.message, ...m }),
        warn: (message: string, m?: any) => childLogger.warn(message, m),
        debug: (message: string, m?: any) => childLogger.debug(message, m),
        child: (m2: Record<string, any>) => createLogger(`${name}:child`, options),
      };
    },
  };
}

export const logger: Logger = createLogger('aegis', {
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  format: (process.env.LOG_FORMAT as 'json' | 'pretty') || 'pretty',
  enableConsole: true,
  enableFile: process.env.NODE_ENV === 'production',
  enableElasticsearch: process.env.NODE_ENV === 'production' || process.env.ELASTICSEARCH_ENABLED === 'true',
});