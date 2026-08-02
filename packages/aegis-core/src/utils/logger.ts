// ============================================
// @aegis/core - Logger (Winston)
// ============================================

import winston from 'winston';

export type LoggerOptions = {
  level?: 'debug' | 'info' | 'warn' | 'error';
  format?: 'json' | 'pretty';
};

export type Logger = {
  info: (message: string, meta?: any) => void;
  error: (message: string, error?: Error, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
};

export function createLogger(name: string, options?: LoggerOptions): Logger {
  const level = options?.level || (process.env.LOG_LEVEL as string) || 'info';
  const format = options?.format || 'pretty';

  const winstonLogger = winston.createLogger({
    level,
    defaultMeta: { service: name },
    transports: [
      new winston.transports.Console({
        format:
          format === 'json'
            ? winston.format.json()
            : winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({ format: 'HH:mm:ss' }),
                winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
                  return `${timestamp} [${service}] ${level}: ${message} ${
                    Object.keys(meta).length ? JSON.stringify(meta) : ''
                  }`;
                }),
              ),
      }),
    ],
  });

  return {
    info: (message: string, meta?: any) => winstonLogger.info(message, meta),
    error: (message: string, error?: Error, meta?: any) =>
      winstonLogger.error(message, { error: error?.message, stack: error?.stack, ...meta }),
    warn: (message: string, meta?: any) => winstonLogger.warn(message, meta),
    debug: (message: string, meta?: any) => winstonLogger.debug(message, meta),
  };
}

export const logger = createLogger('aegis');