// ═══════════════════════════════════════════════════
// AEGIS — Circuit Breaker
// Peş peşe hata alınınca devreyi keser.
// CLOSED → OPEN → HALF_OPEN
// Sadece 'system' tipi hatalar sayacı artırır.
// ═══════════════════════════════════════════════════

import type { CircuitBreakerState, CircuitState, CircuitBreakerOptions } from '../types';
import { classifyError } from './errorClassifier';

// ──── IN-MEMORY STORE ────────────────────────────

const circuitBreakers = new Map<string, CircuitBreakerState>();

const CIRCUIT_STATE_STALE_MS = 60 * 60 * 1000; // 1 saat işlem görmeyen breaker silinir

// ──── YARDIMCI ──────────────────────────────────

function getCircuitBreaker(name: string): CircuitBreakerState {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, {
      failures: 0,
      lastFailure: null,
      state: 'CLOSED',
      updatedAt: Date.now(),
    });
  }
  return circuitBreakers.get(name)!;
}

// ═══════════════════════════════════════════════════
// WITH CIRCUIT BREAKER
// ═══════════════════════════════════════════════════

function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  options: CircuitBreakerOptions = {}
): Promise<T> {
  const threshold = options.threshold ?? 5;
  const resetMs = options.resetMs ?? 30000;

  const breaker = getCircuitBreaker(name);

  // ──── OPEN kontrolü ────────────────────────────

  if (breaker.state === 'OPEN') {
    const timeSinceFailure = Date.now() - (breaker.lastFailure || 0);

    if (timeSinceFailure >= resetMs) {
      breaker.state = 'HALF_OPEN';
      breaker.updatedAt = Date.now();
    } else {
      const remainingSec = Math.ceil((resetMs - timeSinceFailure) / 1000);
      return Promise.reject(
        new Error(`Circuit breaker OPEN for "${name}". Retry in ${remainingSec}s`)
      );
    }
  }

  // ──── İşlemi çalıştır ──────────────────────────

  return fn()
    .then(result => {
      // Başarılı — circuit'i kapat
      breaker.failures = 0;
      breaker.state = 'CLOSED';
      breaker.updatedAt = Date.now();
      return result;
    })
    .catch(error => {
      const classified = classifyError(error);

      // Sadece system hataları breaker'ı tetikler
      if (classified.type === 'system') {
        breaker.failures++;
        breaker.lastFailure = Date.now();
        breaker.updatedAt = Date.now();

        if (breaker.failures >= threshold) {
          breaker.state = 'OPEN';
        }
      }

      throw classified;
    });
}

// ──── STATE YÖNETİMİ ─────────────────────────────

function getCircuitState(name: string): CircuitState {
  return getCircuitBreaker(name).state;
}

function resetCircuit(name: string): void {
  const breaker = circuitBreakers.get(name);
  if (breaker) {
    breaker.failures = 0;
    breaker.state = 'CLOSED';
    breaker.lastFailure = null;
    breaker.updatedAt = Date.now();
  }
}

function getCircuitBreakers(): Map<string, CircuitBreakerState> {
  return new Map(circuitBreakers);
}

// ──── SÜPÜRME ────────────────────────────────────

function sweepStaleBreakers(now: number = Date.now()): void {
  for (const [key, state] of circuitBreakers) {
    const lastActivity = state.lastFailure ?? state.updatedAt;
    if (state.state === 'CLOSED' && now - lastActivity > CIRCUIT_STATE_STALE_MS) {
      circuitBreakers.delete(key);
    }
  }
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  withCircuitBreaker,
  getCircuitState,
  resetCircuit,
  getCircuitBreakers,
  sweepStaleBreakers,
};