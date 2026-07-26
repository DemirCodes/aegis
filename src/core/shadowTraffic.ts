// ═══════════════════════════════════════════════════
// AEGIS — Shadow Traffic
// Canlı isteğin kopyasını test ortamına gönderir.
// Ana işlem etkilenmez, shadow sonuç karşılaştırılır.
// ═══════════════════════════════════════════════════

import { error } from "node:console";

// ──── TYPES ──────────────────────────────────────

interface ShadowResult<T> {
  primary: T;
  shadow?: T;
  shadowError?: Error;
  match: boolean;
  durationMs: {
    primary: number;
    shadow?: number;
  };
}

interface ShadowOptions {
  timeoutMs?: number;
  compareResults?: boolean;
  onMismatch?: (result: ShadowResult<unknown>) => void;
}

type Result<T> = 
  | { success: true; result: T }
  | { success: false; error: Error };

function isSuccess<T>(result: Result<T>): result is { success: true; result: T } {
  return result.success;
}

// ──── HELPERS ──────────────────────────────────

function toResult<T>(promise: Promise<T>): Promise<Result<T>> {
  return promise
    .then(result => ({ success: true, result } satisfies Result<T> ))
    .catch(error => ({ success: false, error: error as Error } satisfies Result<T>));
}


function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Shadow traffic timeout after ${ms}ms`)), ms);

    fn()
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// ═══════════════════════════════════════════════════
// WITH SHADOW TRAFFIC
// ═══════════════════════════════════════════════════

function withShadowTraffic<T>(
  primaryFn: () => Promise<T>,
  shadowFn: () => Promise<T>,
  options: ShadowOptions = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 5000;
  const compareResults = options.compareResults ?? false;

  const primaryStart = Date.now();

  // Shadow'u arka planda başlat, ana işlemi bekleme
  const shadowPromise = toResult(withTimeout(shadowFn, timeoutMs));

  return primaryFn()
    .then(async primaryResult => {
      const primaryDuration = Date.now() - primaryStart;

      // Shadow sonucunu bekle (ama ana işlem çoktan döndü)
      const shadowStart = Date.now();
      const shadowOutcome = await shadowPromise;
      const shadowDuration = Date.now() - shadowStart;

      const shadowResult: ShadowResult<T> = {
        primary: primaryResult,
        match: true,
        durationMs: {
          primary: primaryDuration,
          shadow: isSuccess(shadowOutcome) ? shadowDuration : undefined,
        },
      };

      if (isSuccess(shadowOutcome)) {
        shadowResult.shadow = shadowOutcome.result;
      } else {
        shadowResult.shadowError = shadowOutcome.error;
      }

      // Sonuçları karşılaştır
      if (compareResults && isSuccess(shadowOutcome)) {
        try {
          shadowResult.match = JSON.stringify(primaryResult) === JSON.stringify(shadowOutcome.result);
        } catch {
          shadowResult.match = primaryResult === (shadowOutcome.result as unknown);
        }

        if (!shadowResult.match && options.onMismatch) {
          options.onMismatch(shadowResult);
        }
      }

      return primaryResult;
    });
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  withShadowTraffic,
};

export type {
  ShadowResult,
  ShadowOptions,
};