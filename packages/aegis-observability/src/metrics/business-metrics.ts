// ============================================================
// metrics/business-metrics.ts
// ============================================================

import { Histogram, Counter } from 'prom-client';
import { register } from 'prom-client';
import type {
  PaymentMetrics,
  EndpointMetrics,
  DatabaseMetrics,
  ThirdPartyMetrics,
  UserMetrics,
} from '../types/metrics.types';
import { getOrCreateCacheEntry, buildCacheKey } from '../utils/metric-helpers';

// --- Cache maps (singleton per key) ---
const paymentCache = new Map<string, PaymentMetrics>();
const endpointCache = new Map<string, EndpointMetrics>();
const databaseCache = new Map<string, DatabaseMetrics>();
const thirdPartyCache = new Map<string, ThirdPartyMetrics>();
const userActionCache = new Map<string, UserMetrics>();

// --- Recorder classes ---

class PaymentMetricsRecorder implements PaymentMetrics {
  private readonly latency = new Histogram({
    name: 'aegis_payment_processing_duration_seconds',
    help: 'Payment processing duration in seconds',
    registers: [register],
  });

  private readonly successes = new Counter({
    name: 'aegis_payment_successes_total',
    help: 'Total successful payments',
    registers: [register],
  });

  private readonly errors = new Counter({
    name: 'aegis_payment_errors_total',
    help: 'Total payment errors',
    labelNames: ['error_type'] as const,
    registers: [register],
  });

  recordLatency(ms: number): void {
    this.latency.observe(ms / 1000);
  }

  recordSuccess(): void {
    this.successes.inc();
  }

  recordError(errorType: string): void {
    this.errors.inc({ error_type: errorType });
  }
}

class EndpointMetricsRecorder implements EndpointMetrics {
  constructor(
    private readonly endpoint: string,
    private readonly method: string
  ) {}

  private readonly latency = new Histogram({
    name: 'aegis_endpoint_duration_seconds',
    help: 'Endpoint request duration in seconds',
    labelNames: ['endpoint', 'method'] as const,
    registers: [register],
  });

  private readonly successes = new Counter({
    name: 'aegis_endpoint_successes_total',
    help: 'Total successful endpoint requests',
    labelNames: ['endpoint', 'method'] as const,
    registers: [register],
  });

  private readonly errors = new Counter({
    name: 'aegis_endpoint_errors_total',
    help: 'Total endpoint errors',
    labelNames: ['endpoint', 'method'] as const,
    registers: [register],
  });

  recordLatency(ms: number): void {
    this.latency.observe(
      { endpoint: this.endpoint, method: this.method },
      ms / 1000
    );
  }

  recordSuccess(): void {
    this.successes.inc({ endpoint: this.endpoint, method: this.method });
  }

  recordError(): void {
    this.errors.inc({ endpoint: this.endpoint, method: this.method });
  }
}

class DatabaseMetricsRecorder implements DatabaseMetrics {
  constructor(private readonly operation: string) {}

  private readonly latency = new Histogram({
    name: 'aegis_db_operation_duration_seconds',
    help: 'Database operation duration in seconds',
    labelNames: ['operation'] as const,
    registers: [register],
  });

  private readonly successes = new Counter({
    name: 'aegis_db_successes_total',
    help: 'Total successful DB operations',
    labelNames: ['operation'] as const,
    registers: [register],
  });

  private readonly errors = new Counter({
    name: 'aegis_db_errors_total',
    help: 'Total DB operation errors',
    labelNames: ['operation'] as const,
    registers: [register],
  });

  recordLatency(ms: number): void {
    this.latency.observe({ operation: this.operation }, ms / 1000);
  }

  recordSuccess(): void {
    this.successes.inc({ operation: this.operation });
  }

  recordError(): void {
    this.errors.inc({ operation: this.operation });
  }
}

class ThirdPartyMetricsRecorder implements ThirdPartyMetrics {
  constructor(private readonly serviceName: string) {}

  private readonly latency = new Histogram({
    name: 'aegis_third_party_duration_seconds',
    help: 'Third-party call duration in seconds',
    labelNames: ['service'] as const,
    registers: [register],
  });

  private readonly successes = new Counter({
    name: 'aegis_third_party_successes_total',
    help: 'Total successful third-party calls',
    labelNames: ['service'] as const,
    registers: [register],
  });

  private readonly errors = new Counter({
    name: 'aegis_third_party_errors_total',
    help: 'Total third-party errors',
    labelNames: ['service', 'error_type'] as const,
    registers: [register],
  });

  recordLatency(ms: number): void {
    this.latency.observe({ service: this.serviceName }, ms / 1000);
  }

  recordSuccess(): void {
    this.successes.inc({ service: this.serviceName });
  }

  recordError(errorType: string): void {
    this.errors.inc({ service: this.serviceName, error_type: errorType });
  }
}

class UserMetricsRecorder implements UserMetrics {
  constructor(private readonly actionType: string) {}

  private readonly successes = new Counter({
    name: 'aegis_user_action_successes_total',
    help: 'Total successful user actions',
    labelNames: ['action'] as const,
    registers: [register],
  });

  private readonly errors = new Counter({
    name: 'aegis_user_action_errors_total',
    help: 'Total user action errors',
    labelNames: ['action'] as const,
    registers: [register],
  });

  recordSuccess(): void {
    this.successes.inc({ action: this.actionType });
  }

  recordError(): void {
    this.errors.inc({ action: this.actionType });
  }
}

/**
 * README: "businessMetrics.* (singleton)"
 * README: "Metric instance'ları singleton'dır. Her çağrıda aynı obje döner."
 */
export const businessMetrics = {
  paymentProcessing(): PaymentMetrics {
    return getOrCreateCacheEntry(
      paymentCache,
      'payment',
      () => new PaymentMetricsRecorder()
    );
  },

  apiEndpoint(endpoint: string, method: string): EndpointMetrics {
    const key = buildCacheKey(endpoint, method);
    return getOrCreateCacheEntry(
      endpointCache,
      key,
      () => new EndpointMetricsRecorder(endpoint, method)
    );
  },

  databaseOperation(operation: string): DatabaseMetrics {
    return getOrCreateCacheEntry(
      databaseCache,
      operation,
      () => new DatabaseMetricsRecorder(operation)
    );
  },

  thirdPartyCall(serviceName: string): ThirdPartyMetrics {
    return getOrCreateCacheEntry(
      thirdPartyCache,
      serviceName,
      () => new ThirdPartyMetricsRecorder(serviceName)
    );
  },

  userAction(actionType: string): UserMetrics {
    return getOrCreateCacheEntry(
      userActionCache,
      actionType,
      () => new UserMetricsRecorder(actionType)
    );
  },
};
