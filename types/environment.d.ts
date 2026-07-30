declare namespace NodeJS {
  interface ProcessEnv {
    // Database
    DATABASE_URL: string;
    DATABASE_TEST_URL: string;

    // Redis
    REDIS_URL: string;
    REDIS_PASSWORD?: string;
    REDIS_DB?: string;
    REDIS_KEY_PREFIX?: string;

    // Elasticsearch
    ELASTICSEARCH_URL?: string;
    ELASTICSEARCH_INDEX_PREFIX?: string;

    // Prometheus & Grafana
    PROMETHEUS_URL?: string;
    GRAFANA_URL?: string;

    // JWT
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_ACCESS_EXPIRES_IN: string;
    JWT_REFRESH_EXPIRES_IN: string;
    JWT_ISSUER?: string;

    // API
    NODE_ENV: 'development' | 'test' | 'production';
    PORT: string;
    GRPC_PORT?: string;
    API_PREFIX?: string;
    CORS_ORIGINS?: string;

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS?: string;
    RATE_LIMIT_MAX_REQUESTS?: string;
    RATE_LIMIT_LOGIN_MAX?: string;

    // Audit
    AUDIT_ENABLED?: string;
    AUDIT_SENSITIVE_FIELDS?: string;

    // Logging
    LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
    LOG_FORMAT?: 'json' | 'pretty';

    // Monitoring
    METRICS_ENABLED?: string;
    PROMETHEUS_PORT?: string;
    OTEL_ENABLED?: string;
    OTEL_EXPORTER_OTLP_ENDPOINT?: string;
    TRACING_ENABLED?: string;
    TRACING_SAMPLE_RATE?: string;

    // Cache
    CACHE_DEFAULT_TTL?: string;
    CACHE_MAX_ITEMS?: string;

    // Queue
    QUEUE_REDIS_URL?: string;
    QUEUE_DEFAULT_ATTEMPTS?: string;
    QUEUE_DEFAULT_TIMEOUT?: string;

    // Security
    BCRYPT_SALT_ROUNDS?: string;
    IP_BLACKLIST_ENABLED?: string;
    RISK_SCORING_ENABLED?: string;
    RISK_SCORE_THRESHOLD?: string;
  }
}

export {};