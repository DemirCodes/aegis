// ═══════════════════════════════════════════════════
// AEGIS — Fallback
// Hata durumunda yedek plan devreye girer.
// ═══════════════════════════════════════════════════

import type { FallbackFunction } from '../types';

// ═══════════════════════════════════════════════════
// WITH FALLBACK
// ═══════════════════════════════════════════════════

function withFallback<T>(
  fn: () => Promise<T>,
  fallbackFn: FallbackFunction<T>
): Promise<T> {
  return fn().catch(error => {
    const result = fallbackFn(error);
    // Hem sync hem async fallback'i destekle
    return result instanceof Promise ? result : Promise.resolve(result);
  });
}

// ──── HAZIR FALLBACK'LAR ──────────────────────────

/** Hata mesajını döndüren fallback */
function errorMessageFallback<T>(message: string): FallbackFunction<T> {
  return () => {
    throw new Error(message);
  };
}

/** Varsayılan değer döndüren fallback */
function defaultFallback<T>(defaultValue: T): FallbackFunction<T> {
  return () => defaultValue;
}

/** null döndüren fallback */
function nullFallback<T>(): FallbackFunction<T | null> {
  return () => null;
}

/** Hatayı loglayıp tekrar fırlatan fallback */
function logAndThrowFallback<T>(logger?: (error: Error) => void): FallbackFunction<T> {
  return (error: Error) => {
    if (logger) {
      logger(error);
    } else {
      console.error('[AEGIS Fallback]', error.message);
    }
    throw error;
  };
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  withFallback,
  errorMessageFallback,
  defaultFallback,
  nullFallback,
  logAndThrowFallback,
};