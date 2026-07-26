// ═══════════════════════════════════════════════════
// AEGIS — Retry
// Başarısız işlemi otomatik tekrar dener.
// Backoff + Jitter desteği.
// Sadece classifyError().retryable === true ise çalışır.
// ═══════════════════════════════════════════════════

import type { RetryOptions, BackoffStrategy } from '../types';
import { classifyError } from './errorClassifier';
import { sleep } from './timeout';

// ═══════════════════════════════════════════════════
// WITH RETRY
// ═══════════════════════════════════════════════════

function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const {
    maxRetries = 3,
    backoff = 'exponential' as BackoffStrategy,
    baseDelayMs = 1000,
    jitter = true,
  } = options;

  return new Promise((resolve, reject) => {
    let attempt = 0;

    function tryOnce(): void {
      attempt++;

      fn()
        .then(resolve)
        .catch(async (error: Error) => {
          const classified = classifyError(error);
          const attemptsLeft = attempt <= maxRetries;

          // Eğer hata tekrar denenebilir değilse veya deneme hakkı bittiyse
          if (!classified.retryable || !attemptsLeft) {
            return reject(classified);
          }

          // Bekleme süresini hesapla
          let delay: number;
          switch (backoff) {
            case 'fixed':
              delay = baseDelayMs;
              break;
            case 'linear':
              delay = baseDelayMs * attempt;
              break;
            case 'exponential':
              delay = baseDelayMs * Math.pow(2, attempt - 1);
              break;
            default:
              delay = baseDelayMs;
          }

          // Jitter: rastgelelik ekle, thundering herd'ü engelle
          if (jitter) {
            delay = delay + Math.random() * (delay * 0.3);
          }

          await sleep(Math.floor(delay));
          tryOnce();
        });
    }

    tryOnce();
  });
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export { withRetry };