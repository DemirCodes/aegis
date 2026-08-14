"use strict";
// ============================================
// @aegis/core - Logger
// Winston tabanlı, Elasticsearch destekli loglama sistemi
// ============================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createLogger = createLogger;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
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
function sanitizeMeta(meta) {
    if (!meta || typeof meta !== 'object')
        return meta;
    const sanitized = { ...meta };
    for (const key of Object.keys(sanitized)) {
        const lowerKey = key.toLowerCase();
        // Hassas anahtar kelime içeriyorsa maskele
        if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
            sanitized[key] = '[REDACTED]';
        }
        // İç içe objeleri de kontrol et (1 seviye derinlik)
        else if (typeof sanitized[key] === 'object' &&
            sanitized[key] !== null &&
            !Array.isArray(sanitized[key])) {
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
async function createElasticsearchTransport(name, options) {
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
    }
    catch {
        // Paket yüklü değilse veya bağlantı hatası varsa sessizce geç
        console.warn(`[${name}] Elasticsearch transport unavailable ` +
            `(winston-elasticsearch package not installed or connection failed)`);
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
function parseSize(size) {
    const units = {
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
function createTransports(options) {
    const transports = [];
    // --- CONSOLE TRANSPORT ---
    if (options?.enableConsole !== false) {
        const format = options?.format || 'pretty';
        transports.push(new winston_1.default.transports.Console({
            format: format === 'json'
                ? winston_1.default.format.json()
                : winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, service, ...meta }) => {
                    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                    return `${timestamp} [${service || 'app'}] ${level}: ${message}${metaStr}`;
                })),
        }));
    }
    // --- FILE TRANSPORT ---
    if (options?.enableFile !== false) {
        const logDir = options?.logDir || path_1.default.join(process.cwd(), 'logs');
        // Log dizini yoksa oluştur
        if (!fs_1.default.existsSync(logDir)) {
            fs_1.default.mkdirSync(logDir, { recursive: true });
        }
        const maxSize = options?.maxSize ? parseSize(options.maxSize) : 10 * 1024 * 1024; // 10MB
        const maxFiles = options?.maxFiles || 5;
        // Hata log'ları ayrı dosyada
        transports.push(new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'error.log'),
            level: 'error',
            maxsize: maxSize,
            maxFiles,
            format: winston_1.default.format.json(),
        }));
        // Tüm log'lar combined dosyasında
        transports.push(new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'combined.log'),
            maxsize: maxSize,
            maxFiles,
            format: winston_1.default.format.json(),
        }));
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
function createLogger(name, options) {
    // Log seviyesi: opsiyon > env > varsayılan
    const level = options?.level || process.env.LOG_LEVEL || 'info';
    // Transport'ları oluştur
    const transports = createTransports(options);
    // Elasticsearch transport'unu asenkron ekle (varsa)
    if (options?.enableElasticsearch !== false &&
        (process.env.NODE_ENV === 'production' || process.env.ELASTICSEARCH_ENABLED === 'true')) {
        createElasticsearchTransport(name, options).then(esTransport => {
            if (esTransport) {
                transports.push(esTransport);
            }
        });
    }
    // Winston logger instance'ı oluştur
    const winstonLogger = winston_1.default.createLogger({
        level,
        defaultMeta: { service: name },
        transports,
    });
    // Logger arayüzünü döndür (sadeleştirilmiş, tip güvenli)
    return {
        info: (message, meta) => {
            winstonLogger.info(message, sanitizeMeta(meta));
        },
        error: (message, error, meta) => {
            winstonLogger.error(message, {
                error: error?.message,
                stack: error?.stack,
                ...sanitizeMeta(meta),
            });
        },
        warn: (message, meta) => {
            winstonLogger.warn(message, sanitizeMeta(meta));
        },
        debug: (message, meta) => {
            winstonLogger.debug(message, sanitizeMeta(meta));
        },
        child: (meta) => {
            const childLogger = winstonLogger.child(meta);
            return {
                info: (message, m) => childLogger.info(message, m),
                error: (message, error, m) => childLogger.error(message, { error: error?.message, ...m }),
                warn: (message, m) => childLogger.warn(message, m),
                debug: (message, m) => childLogger.debug(message, m),
                child: (m2) => createLogger(`${name}:child`, options),
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
exports.logger = createLogger('aegis', {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'pretty',
    enableConsole: true,
    enableFile: process.env.NODE_ENV === 'production',
    enableElasticsearch: process.env.NODE_ENV === 'production' || process.env.ELASTICSEARCH_ENABLED === 'true',
});
//# sourceMappingURL=logger.js.map