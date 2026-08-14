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
    elasticsearchNode?: string;
    elasticsearchIndex?: string;
};
export type Logger = {
    info: (message: string, meta?: Record<string, any>) => void;
    error: (message: string, error?: Error, meta?: Record<string, any>) => void;
    warn: (message: string, meta?: Record<string, any>) => void;
    debug: (message: string, meta?: Record<string, any>) => void;
    child: (meta: Record<string, any>) => Logger;
};
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
export declare function createLogger(name: string, options?: LoggerOptions): Logger;
/**
 * Framework genelinde kullanılan varsayılan logger instance'ı
 * Uygulama başlatılırken otomatik olarak hazır olur
 *
 * @example
 * import { logger } from '@aegis/core';
 * logger.info('App started');
 */
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map