// ═══════════════════════════════════════════════════
// AEGIS — Error Classifier
// Hataları sınıflandırır: system / user / security
// Retry kararı bu sınıflandırmaya göre verilir
// ═══════════════════════════════════════════════════

import type { ClassifiedError, ErrorType } from '../types';

// ──── YARDIMCI ──────────────────────────────────

function makeClassifiedError(base: {
  type: ErrorType;
  original: Error;
  retryable: boolean;
  message: string;
}): ClassifiedError {
  const err = new Error(base.message) as ClassifiedError;
  err.type = base.type;
  err.original = base.original;
  err.retryable = base.retryable;
  err.stack = base.original.stack;
  return err;
}

// ═══════════════════════════════════════════════════
// CLASSIFY ERROR
// ═══════════════════════════════════════════════════

function classifyError(error: Error): ClassifiedError {
  const message = error?.message || '';

  // Zaten sınıflandırılmışsa tekrar sarmalama
  if ((error as ClassifiedError).type) {
    return error as ClassifiedError;
  }

  // ──── SYSTEM ERRORS (geçici, retry mantıklı) ────

  if (
    message.includes('ECONNREFUSED') ||
    message.includes('ETIMEDOUT') ||
    message.includes('timed out') ||
    message.includes('ENOTFOUND') ||
    message.includes('ECONNRESET') ||
    message.includes('EPIPE') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504')
  ) {
    return makeClassifiedError({
      type: 'system',
      original: error,
      retryable: true,
      message: `System error: ${message}`,
    });
  }

  // ──── CIRCUIT BREAKER REDDİ ────────────────────

  if (message.includes('Circuit breaker OPEN')) {
    return makeClassifiedError({
      type: 'system',
      original: error,
      retryable: false, // breaker zaten korumada, retry boşuna
      message: `Circuit open: ${message}`,
    });
  }

  // ──── SECURITY / LIMIT ERRORS ──────────────────

  if (
    message.includes('Rate limit exceeded') ||
    message.includes('Request blocked') ||
    message.includes('blacklisted') ||
    message.includes('forbidden') ||
    message.includes('unauthorized') ||
    message.includes('401') ||
    message.includes('403')
  ) {
    return makeClassifiedError({
      type: 'security',
      original: error,
      retryable: message.includes('Rate limit exceeded'), // 429: bekleyip tekrar dene
      message: `Security violation: ${message}`,
    });
  }

  // 429 statusCode ile gelen ama mesajda yakalanmayan
  if ((error as any)?.statusCode === 429 || (error as any)?.status === 429) {
    return makeClassifiedError({
      type: 'security',
      original: error,
      retryable: true,
      message: `Rate limited (429): ${message}`,
    });
  }

  // ──── USER ERRORS (default, retry anlamsız) ─────

  return makeClassifiedError({
    type: 'user',
    original: error,
    retryable: false,
    message: `User error: ${message}`,
  });
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export { classifyError, makeClassifiedError };