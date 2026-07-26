// ═══════════════════════════════════════════════════
// AEGIS — Timeout
// İşleme maksimum süre koyar. Süre dolunca iptal.
// ═══════════════════════════════════════════════════

import type { TimeoutOptions } from '../types';

// ──── YARDIMCI ──────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════
// WITH TIMEOUT
// ═══════════════════════════════════════════════════

function withTimeout<T>(
  fn: () => Promise<T>,
  options: number | TimeoutOptions
): Promise<T> {
  const opts = typeof options === 'number' ? { ms: options } : options;
  const ms = opts.ms;
  const message = opts.message || `Operation timed out after ${ms}ms`;

  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(message));
    }, ms);

    fn()
      .then(result => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
  });
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export { withTimeout, sleep };