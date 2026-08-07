// ============================================
// @aegis/core - Logger
// Winston tabanlı, Elasticsearch destekli loglama sistemi
// ============================================

import winston from 'winston';
import path from 'path';
import fs from 'fs';

// --- TİP TANIMLARI ---

// Log seviyeleri (Winston uyumlu)
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Logger oluşturma opsiyonları
export type LoggerOptions = {
  level?: LogLevel;                     // Minimum log seviyesi
  format?: 'json' | 'pretty';           // Çıktı formatı
  logDir?: string;                      // Log dosyalarının kaydedileceği dizin
  maxFiles?: number;                    // Maksimum log dosyası sayısı (rotasyon)
  maxSize?: string;                     // Maksimum dosya boyutu (örn: '10mb', '50kb')
  enableConsole?: boolean;              // Konsola yazdırma
  enableFile?: boolean;                 // Dosyaya yazdırma
  enableElasticsearch?: boolean;        // Elasticsearch'e gönderme
  elasticsearchNode?: string;           // Elasticsearch URL'i
  elasticsearchIndex?: string;          // Elasticsearch index öneki
};

// Logger arayüzü (dışa açılan tip)
export type Logger = {
  info: (message: string, meta?: Record<string, any>) => void;
  error: (message: string, error?: Error, meta?: Record<string, any>) => void;
  warn: (message: string, meta?: Record<string, any>) => void;
  debug: (message: string, meta?: Record<string, any>) => void;
  child: (meta: Record<string, any>) => Logger;
};

// --- HASSAS VERİ SANITIZATION ---

// Log'da görünmemesi gereken hassas alan adları
const SENSITIVE_KEYS = [
  'password', 'secret', 'token', 'key', 'authorization',
  'credit', 'card', 'cvv', 'ssn', 'passport',
];

/**
 * Loglanacak metadata içindeki hassas verileri maskeler
 * İç içe objeleri de 1 seviye kontrol eder
 * 
 * @param meta - Ham metadata objesi
 * @returns Maskelenmiş metadata (hassas alanlar '[REDACTED]' olur)
 */
function sanitizeMeta(meta?: Record<string, any>): Record<string, any> | undefined {
  if (!meta || typeof meta !== 'object') return meta;
  
  const sanitized = { ...meta };
  
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    
    // Hassas anahtar kelime içeriyorsa maskele
    if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
    // İç içe objeleri de kontrol et (1 seviye derinlik)
    else if (
      typeof sanitized[key] === 'object' &&
      sanitized[key] !== null &&
      !Array.isArray(sanitized[key])
    ) {
      sanitized[key] = sanitizeMeta(sanitized[key]);
    }
  }
  
  return sanitized;
}

// --- ELASTICSEARCH TRANSPORT (Opsiyonel) ---

/**
 * Elasticsearch transport'u oluşturur
 * winston-elasticsearch paketi opsiyonel bağımlılıktır
 * Paket yüklü değilse veya bağlantı kurulamazsa null döner, sistemi durdurmaz
 * 
 * @param name - Logger adı
 * @param options - Logger opsiyonları
 * @returns ElasticsearchTransport veya null
 */
async function createElasticsearchTransport(
  name: string,
  options?: LoggerOptions
): Promise<winston.transport | null> {
  try {
    // Dynamic import - paket yüklü değilse build patlamaz, runtime'da catch'e düşer
    const { ElasticsearchTransport } = await import('winston-elasticsearch');
    
    const esNode = options?.elasticsearchNode || process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
    const esIndex = options?.elasticsearchIndex || process.env.ELASTICSEARCH_INDEX_PREFIX || 'aegis-logs';
    
    return new ElasticsearchTransport({
      level: 'info',
      clientOpts: { node: esNode },
      indexPrefix: esIndex,
      indexSuffixPattern: 'YYYY.MM.DD',
    });
  } catch {
    // Paket yüklü değilse veya bağlantı hatası varsa sessizce geç
    console.warn(
      `[${name}] Elasticsearch transport unavailable ` +
      `(winston-elasticsearch package not installed or connection failed)`
    );
    return null;
  }
}

// --- TRANSPORT OLUŞTURMA ---

/**
 * Log dosyası boyut string'ini byte'a çevirir
 * 
 * @param size - Boyut string'i (örn: '10mb', '50kb', '1gb')
 * @returns Byte cinsinden boyut
 * 
 * @example
 * parseSize('10mb')  // 10485760
 * parseSize('50kb')  // 51200
 */
function parseSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  
  const match = size.toLowerCase().match(/^(\d+)\s*(b|kb|mb|gb)?$/);
  if (match) {
    return parseInt(match[1], 10) * (units[match[2]] || 1);
  }
  
  // Geçersiz formatta varsayılan: 10MB
  return 10 * 1024 * 1024;
}

/**
 * Winston transport'larını oluşturur
 * - Console: Geliştirme ortamında renkli/formatlı çıktı
 * - File: Production'da JSON formatında dosyaya yazma
 * 
 * @param options - Logger opsiyonları
 * @returns Winston transport dizisi
 */
function createTransports(options?: LoggerOptions): winston.transport[] {
  const transports: winston.transport[] = [];
  
  // --- CONSOLE TRANSPORT ---
  if (options?.enableConsole !== false) {
    const format = options?.format || 'pretty';
    
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
  
  // --- FILE TRANSPORT ---
  if (options?.enableFile !== false) {
    const logDir = options?.logDir || path.join(process.cwd(), 'logs');
    
    // Log dizini yoksa oluştur
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const maxSize = options?.maxSize ? parseSize(options.maxSize) : 10 * 1024 * 1024; // 10MB
    const maxFiles = options?.maxFiles || 5;
    
    // Hata log'ları ayrı dosyada
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: maxSize,
        maxFiles,
        format: winston.format.json(),
      }),
    );
    
    // Tüm log'lar combined dosyasında
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: maxSize,
        maxFiles,
        format: winston.format.json(),
      }),
    );
  }
  
  return transports;
}

// --- LOGGER OLUŞTURMA ---

/**
 * Yeni bir Logger instance'ı oluşturur
 * 
 * @param name - Logger adı (servis/modül adı - log'da `service` alanında görünür)
 * @param options - Logger konfigürasyonu
 * @returns Logger instance'ı (info, error, warn, debug, child metodlarıyla)
 * 
 * @example
 * // Basit kullanım
 * const log = createLogger('UserService');
 * log.info('User created', { userId: '123' });
 * log.error('DB error', new Error('Connection failed'));
 * 
 * @example
 * // Özelleştirilmiş
 * const log = createLogger('PaymentService', {
 *   level: 'debug',
 *   enableConsole: true,
 *   enableFile: true,
 *   enableElasticsearch: true,
 * });
 */
export function createLogger(name: string, options?: LoggerOptions): Logger {
  // Log seviyesi: opsiyon > env > varsayılan
  const level = options?.level || (process.env.LOG_LEVEL as LogLevel) || 'info';
  
  // Transport'ları oluştur
  const transports = createTransports(options);
  
  // Elasticsearch transport'unu asenkron ekle (varsa)
  if (
    options?.enableElasticsearch !== false &&
    (process.env.NODE_ENV === 'production' || process.env.ELASTICSEARCH_ENABLED === 'true')
  ) {
    createElasticsearchTransport(name, options).then(esTransport => {
      if (esTransport) {
        transports.push(esTransport);
      }
    });
  }
  
  // Winston logger instance'ı oluştur
  const winstonLogger = winston.createLogger({
    level,
    defaultMeta: { service: name },
    transports,
  });
  
  // Logger arayüzünü döndür (sadeleştirilmiş, tip güvenli)
  return {
    info: (message: string, meta?: Record<string, any>) => {
      winstonLogger.info(message, sanitizeMeta(meta));
    },
    
    error: (message: string, error?: Error, meta?: Record<string, any>) => {
      winstonLogger.error(message, {
        error: error?.message,
        stack: error?.stack,
        ...sanitizeMeta(meta),
      });
    },
    
    warn: (message: string, meta?: Record<string, any>) => {
      winstonLogger.warn(message, sanitizeMeta(meta));
    },
    
    debug: (message: string, meta?: Record<string, any>) => {
      winstonLogger.debug(message, sanitizeMeta(meta));
    },
    
    child: (meta: Record<string, any>) => {
      const childLogger = winstonLogger.child(meta);
      return {
        info: (message: string, m?: Record<string, any>) => childLogger.info(message, m),
        error: (message: string, error?: Error, m?: Record<string, any>) =>
          childLogger.error(message, { error: error?.message, ...m }),
        warn: (message: string, m?: Record<string, any>) => childLogger.warn(message, m),
        debug: (message: string, m?: Record<string, any>) => childLogger.debug(message, m),
        child: (m2: Record<string, any>) => createLogger(`${name}:child`, options),
      };
    },
  };
}

// --- VARSAYILAN LOGGER ---

/**
 * Framework genelinde kullanılan varsayılan logger instance'ı
 * Uygulama başlatılırken otomatik olarak hazır olur
 * 
 * @example
 * import { logger } from '@aegis/core';
 * logger.info('App started');
 */
export const logger: Logger = createLogger('aegis', {
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  format: (process.env.LOG_FORMAT as 'json' | 'pretty') || 'pretty',
  enableConsole: true,
  enableFile: process.env.NODE_ENV === 'production',
  enableElasticsearch:
    process.env.NODE_ENV === 'production' || process.env.ELASTICSEARCH_ENABLED === 'true',
});