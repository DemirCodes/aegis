aegis/
├── package.json (root)
├── tsconfig.json
├── turbo.json
├── .gitignore
├── .eslintrc.json
├── .prettierrc.json
├── pnpm-workspace.yaml
│
├── apps/
│   └── demo/                          # Demo/Test uygulaması
│       ├── package.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── server.ts
│       │   ├── config/
│       │   ├── routes/
│       │   └── services/
│       ├── docker-compose.yml
│       ├── Dockerfile
│       ├── .env.example
│       └── tsconfig.json
│
├── packages/
│
│   ├── aegis-audit/                  # ⭐ TIER 1
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── middleware/
│   │   │   │   ├── audit.middleware.ts
│   │   │   │   ├── soft-delete.middleware.ts
│   │   │   │   └── gdpr-engine.ts
│   │   │   ├── decorators/
│   │   │   │   ├── audited.decorator.ts
│   │   │   │   └── soft-delete.decorator.ts
│   │   │   ├── services/
│   │   │   │   ├── audit-trail.service.ts
│   │   │   │   ├── gdpr-deletion.service.ts
│   │   │   │   └── audit-report.service.ts
│   │   │   ├── types/
│   │   │   │   ├── audit.types.ts
│   │   │   │   └── gdpr.types.ts
│   │   │   ├── prisma/
│   │   │   │   └── audit.prisma
│   │   │   └── utils/
│   │   │       └── audit-helpers.ts
│   │   ├── tests/
│   │   │   ├── audit.test.ts
│   │   │   ├── gdpr.test.ts
│   │   │   └── fixtures/
│   │   └── dist/
│   │
│   ├── aegis-observability/          # ⭐ TIER 1
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── middleware/
│   │   │   │   ├── trace-correlation.middleware.ts
│   │   │   │   └── metrics.middleware.ts
│   │   │   ├── metrics/
│   │   │   │   ├── business-metrics.ts
│   │   │   │   ├── anomaly-detector.ts
│   │   │   │   └── metric-definitions.ts
│   │   │   ├── exporters/
│   │   │   │   ├── prometheus-exporter.ts
│   │   │   │   └── otel-exporter.ts
│   │   │   ├── services/
│   │   │   │   ├── trace.service.ts
│   │   │   │   ├── logging.service.ts
│   │   │   │   └── correlation.service.ts
│   │   │   ├── types/
│   │   │   │   ├── trace.types.ts
│   │   │   │   └── metrics.types.ts
│   │   │   └── utils/
│   │   │       ├── anomaly-algorithms.ts
│   │   │       └── metric-helpers.ts
│   │   ├── dashboards/
│   │   │   ├── default-dashboard.json
│   │   │   ├── business-metrics-dashboard.json
│   │   │   └── anomaly-dashboard.json
│   │   ├── tests/
│   │   └── dist/
│   │
│   ├── aegis-resilience/            # ⭐ TIER 1
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── decorators/
│   │   │   │   ├── grpc-call.decorator.ts
│   │   │   │   ├── circuit-breaker.decorator.ts
│   │   │   │   └── retry.decorator.ts
│   │   │   ├── services/
│   │   │   │   ├── circuit-breaker.service.ts
│   │   │   │   ├── retry.service.ts
│   │   │   │   └── health-check.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── retry.strategy.ts
│   │   │   │   ├── backoff.strategy.ts
│   │   │   │   └── fallback.strategy.ts
│   │   │   ├── state-machine/
│   │   │   │   └── circuit-breaker.state.ts
│   │   │   ├── types/
│   │   │   │   ├── resilience.types.ts
│   │   │   │   └── circuit-breaker.types.ts
│   │   │   └── utils/
│   │   │       └── resilience-helpers.ts
│   │   ├── tests/
│   │   └── dist/
│   │
│   ├── aegis-cache/                 # 📊 TIER 2
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── decorators/
│   │   │   │   ├── cacheable.decorator.ts
│   │   │   │   └── cache-invalidate.decorator.ts
│   │   │   ├── services/
│   │   │   │   ├── cache.service.ts
│   │   │   │   ├── cache-invalidation.service.ts
│   │   │   │   └── cache-warming.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── write-through.strategy.ts
│   │   │   │   ├── cache-aside.strategy.ts
│   │   │   │   └── write-behind.strategy.ts
│   │   │   ├── types/
│   │   │   │   └── cache.types.ts
│   │   │   └── utils/
│   │   │       ├── key-naming.ts
│   │   │       └── cache-helpers.ts
│   │   ├── tests/
│   │   └── dist/
│   │
│   ├── aegis-validation/            # 📊 TIER 2
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── middleware/
│   │   │   │   └── validation.middleware.ts
│   │   │   ├── services/
│   │   │   │   ├── zod-validator.service.ts
│   │   │   │   ├── proto-validator.service.ts
│   │   │   │   └── error-formatter.service.ts
│   │   │   ├── generators/
│   │   │   │   ├── proto-generator.ts
│   │   │   │   └── openapi-generator.ts
│   │   │   ├── decorators/
│   │   │   │   └── validate.decorator.ts
│   │   │   ├── types/
│   │   │   │   └── validation.types.ts
│   │   │   └── utils/
│   │   │       └── validation-helpers.ts
│   │   ├── tests/
│   │   └── dist/
│   │
│   ├── aegis-queue/                 # 📊 TIER 2
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   │   ├── queue.service.ts
│   │   │   │   ├── dlq-handler.service.ts
│   │   │   │   ├── job-idempotency.service.ts
│   │   │   │   └── queue-monitor.service.ts
│   │   │   ├── decorators/
│   │   │   │   ├── queue-job.decorator.ts
│   │   │   │   └── idempotent.decorator.ts
│   │   │   ├── strategies/
│   │   │   │   ├── retry-strategy.ts
│   │   │   │   ├── classification.strategy.ts
│   │   │   │   └── priority-manager.ts
│   │   │   ├── types/
│   │   │   │   ├── queue.types.ts
│   │   │   │   └── job.types.ts
│   │   │   └── utils/
│   │   │       └── queue-helpers.ts
│   │   ├── tests/
│   │   └── dist/
│   │
│   ├── aegis-security/              # 📊 TIER 2
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── middleware/
│   │   │   │   ├── rate-limiter.middleware.ts
│   │   │   │   ├── blacklist.middleware.ts
│   │   │   │   └── risk-scorer.middleware.ts
│   │   │   ├── services/
│   │   │   │   ├── rate-limit.service.ts
│   │   │   │   ├── blacklist.service.ts
│   │   │   │   ├── jwt.service.ts
│   │   │   │   ├── risk-scoring.service.ts
│   │   │   │   └── step-up-auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── rate-limit-strategy.ts
│   │   │   │   ├── jwt-strategy.ts
│   │   │   │   └── risk-strategy.ts
│   │   │   ├── types/
│   │   │   │   ├── security.types.ts
│   │   │   │   └── risk.types.ts
│   │   │   └── utils/
│   │   │       ├── token-helpers.ts
│   │   │       └── security-helpers.ts
│   │   ├── tests/
│   │   └── dist/
│   │
│   ├── aegis-starter-template/      # 🏗️ TIER 3
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── template/
│   │   │   ├── docker-compose.yml
│   │   │   ├── Dockerfile
│   │   │   ├── .dockerignore
│   │   │   ├── .env.example
│   │   │   ├── .env.test
│   │   │   ├── tsconfig.json
│   │   │   ├── tsconfig.build.json
│   │   │   ├── .eslintrc.json
│   │   │   ├── .prettierrc.json
│   │   │   ├── jest.config.js
│   │   │   ├── package.json
│   │   │   ├── .github/
│   │   │   │   ├── workflows/
│   │   │   │   │   ├── ci.yml
│   │   │   │   │   ├── cd.yml
│   │   │   │   │   └── security.yml
│   │   │   │   └── PULL_REQUEST_TEMPLATE.md
│   │   │   ├── src/
│   │   │   │   ├── main.ts
│   │   │   │   ├── app.module.ts
│   │   │   │   ├── config/
│   │   │   │   │   ├── database.config.ts
│   │   │   │   │   ├── redis.config.ts
│   │   │   │   │   └── app.config.ts
│   │   │   │   ├── common/
│   │   │   │   ├── health/
│   │   │   │   └── prisma/
│   │   │   │       ├── schema.prisma
│   │   │   │       └── seed.ts
│   │   │   ├── prisma/
│   │   │   │   └── migrations/
│   │   │   ├── tests/
│   │   │   ├── docs/
│   │   │   └── scripts/
│   │   ├── grafana-dashboards/
│   │   │   ├── default-dashboard.json
│   │   │   └── alerts.json
│   │   └── scripts/
│   │       └── setup.sh
│   │
│   ├── aegis-cli/                   # 🏗️ TIER 3
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── tsconfig.json
│   │   ├── bin/
│   │   │   └── aegis.js
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── commands/
│   │   │   │   ├── scaffold.command.ts
│   │   │   │   ├── migrate.command.ts
│   │   │   │   ├── audit-export.command.ts
│   │   │   │   ├── health-check.command.ts
│   │   │   │   └── benchmark.command.ts
│   │   │   ├── services/
│   │   │   │   ├── project-generator.ts
│   │   │   │   ├── migration-runner.ts
│   │   │   │   └── benchmark.service.ts
│   │   │   ├── utils/
│   │   │   │   └── cli-helpers.ts
│   │   │   └── types/
│   │   │       └── cli.types.ts
│   │   ├── templates/
│   │   │   └── project-template/
│   │   ├── tests/
│   │   └── dist/
│   │
│   ├── aegis-docs/                  # 📚 TIER 3
│   │   ├── package.json
│   │   ├── docs/
│   │   │   ├── README.md
│   │   │   ├── getting-started.md
│   │   │   ├── architecture.md
│   │   │   ├── guides/
│   │   │   │   ├── setup-guide.md
│   │   │   │   ├── best-practices.md
│   │   │   │   ├── troubleshooting.md
│   │   │   │   ├── performance-tuning.md
│   │   │   │   └── security-guide.md
│   │   │   ├── api-reference/
│   │   │   │   ├── audit.md
│   │   │   │   ├── observability.md
│   │   │   │   ├── resilience.md
│   │   │   │   ├── cache.md
│   │   │   │   ├── validation.md
│   │   │   │   ├── queue.md
│   │   │   │   └── security.md
│   │   │   ├── examples/
│   │   │   │   ├── basic-setup.md
│   │   │   │   ├── microservices.md
│   │   │   │   ├── event-driven.md
│   │   │   │   └── scaling.md
│   │   │   ├── migration/
│   │   │   │   ├── v0-to-v1.md
│   │   │   │   └── upgrade-guide.md
│   │   │   ├── adr/ (Architecture Decision Records)
│   │   │   │   ├── adr-001-library-architecture.md
│   │   │   │   ├── adr-002-observability-strategy.md
│   │   │   │   └── adr-003-cache-invalidation.md
│   │   │   └── faq.md
│   │   ├── assets/
│   │   │   ├── diagrams/
│   │   │   └── images/
│   │   └── docusaurus.config.js (optional)
│   │
│   ├── aegis-testing/               # 🔧 TIER 4
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── jest/
│   │   │   │   ├── jest.config.ts
│   │   │   │   └── test-setup.ts
│   │   │   ├── decorators/
│   │   │   │   ├── mock.decorator.ts
│   │   │   │   └── test-db.decorator.ts
│   │   │   ├── utilities/
│   │   │   │   ├── test-database.ts
│   │   │   │   ├── test-redis.ts
│   │   │   │   ├── mock-factory.ts
│   │   │   │   └── fixtures.ts
│   │   │   ├── helpers/
│   │   │   │   ├── assertion-helpers.ts
│   │   │   │   └── async-helpers.ts
│   │   │   └── types/
│   │   │       └── testing.types.ts
│   │   ├── fixtures/
│   │   │   └── test-data/
│   │   └── dist/
│   │
│   ├── aegis-performance/           # 🔧 TIER 4
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── profilers/
│   │   │   │   ├── query-profiler.ts
│   │   │   │   ├── memory-profiler.ts
│   │   │   │   └── response-profiler.ts
│   │   │   ├── detectors/
│   │   │   │   ├── memory-leak-detector.ts
│   │   │   │   └── performance-regression.ts
│   │   │   ├── tools/
│   │   │   │   ├── load-test-runner.ts
│   │   │   │   └── benchmark-analyzer.ts
│   │   │   ├── reports/
│   │   │   │   ├── performance-report.ts
│   │   │   │   └── regression-report.ts
│   │   │   └── types/
│   │   │       └── performance.types.ts
│   │   ├── tests/
│   │   └── dist/
│   │
│   ├── aegis-migration/             # 🔧 TIER 4
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   │   ├── migration.service.ts
│   │   │   │   ├── version-manager.ts
│   │   │   │   └── rollback.service.ts
│   │   │   ├── runners/
│   │   │   │   ├── migration-runner.ts
│   │   │   │   └── rollback-runner.ts
│   │   │   ├── validators/
│   │   │   │   ├── migration-validator.ts
│   │   │   │   └── schema-validator.ts
│   │   │   ├── transformers/
│   │   │   │   └── data-transformer.ts
│   │   │   └── types/
│   │   │       └── migration.types.ts
│   │   ├── migrations/
│   │   │   └── example/
│   │   ├── tests/
│   │   └── dist/
│   │
│   └── aegis-core/                  # Shared utilities
│       ├── package.json
│       ├── README.md
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── types/
│       │   │   ├── common.types.ts
│       │   │   └── errors.types.ts
│       │   ├── utils/
│       │   │   ├── logger.ts
│       │   │   ├── error-handler.ts
│       │   │   ├── env-loader.ts
│       │   │   └── common-helpers.ts
│       │   ├── constants/
│       │   │   └── app-constants.ts
│       │   └── errors/
│       │       ├── app-error.ts
│       │       └── error-codes.ts
│       ├── tests/
│       └── dist/
│
├── docs/                            # Root documentation
│   ├── README.md
│   ├── CONTRIBUTING.md
│   ├── CODE_OF_CONDUCT.md
│   ├── ARCHITECTURE.md
│   ├── ROADMAP.md
│   └── CHANGELOG.md
│
├── scripts/
│   ├── setup.sh                      # Initial setup
│   ├── build-all.sh                  # Build all packages
│   ├── test-all.sh                   # Test all packages
│   ├── publish.sh                    # Publish to npm
│   └── version-bump.sh               # Bump versions
│
└── .github/
    ├── workflows/
    │   ├── lint.yml                  # ESLint & Prettier
    │   ├── test.yml                  # Run tests
    │   ├── build.yml                 # Build packages
    │   ├── publish.yml               # Publish to npm
    │   └── security.yml              # Dependency scanning
    ├── ISSUE_TEMPLATE/
    │   ├── bug_report.md
    │   └── feature_request.md
    └── PULL_REQUEST_TEMPLATE.md





______________________________________________
# Root dizini oluştur
mkdir aegis && cd aegis

# Root config dosyaları
touch package.json tsconfig.json turbo.json .gitignore .eslintrc.json .prettierrc.json pnpm-workspace.yaml

# Apps
mkdir -p apps/demo/src/{config,routes,services}
touch apps/demo/src/{index.ts,server.ts}
touch apps/demo/{package.json,docker-compose.yml,Dockerfile,.env.example,tsconfig.json}

# Packages - Tier 1
mkdir -p packages/aegis-core/src/{types,utils,constants,errors}
touch packages/aegis-core/src/{index.ts,types/common.types.ts,types/errors.types.ts,utils/logger.ts,utils/error-handler.ts,utils/env-loader.ts,utils/common-helpers.ts,constants/app-constants.ts,errors/app-error.ts,errors/error-codes.ts}
touch packages/aegis-core/{package.json,README.md,tsconfig.json}

mkdir -p packages/aegis-audit/src/{middleware,decorators,services,types,prisma,utils}
mkdir -p packages/aegis-audit/tests/fixtures
touch packages/aegis-audit/src/{index.ts,middleware/audit.middleware.ts,middleware/soft-delete.middleware.ts,middleware/gdpr-engine.ts,decorators/audited.decorator.ts,decorators/soft-delete.decorator.ts,services/audit-trail.service.ts,services/gdpr-deletion.service.ts,services/audit-report.service.ts,types/audit.types.ts,types/gdpr.types.ts,prisma/audit.prisma,utils/audit-helpers.ts}
touch packages/aegis-audit/tests/{audit.test.ts,gdpr.test.ts}
touch packages/aegis-audit/{package.json,README.md,tsconfig.json}

mkdir -p packages/aegis-observability/src/{middleware,metrics,exporters,services,types,utils}
mkdir -p packages/aegis-observability/dashboards
mkdir -p packages/aegis-observability/tests
touch packages/aegis-observability/src/{index.ts,middleware/trace-correlation.middleware.ts,middleware/metrics.middleware.ts,metrics/business-metrics.ts,metrics/anomaly-detector.ts,metrics/metric-definitions.ts,exporters/prometheus-exporter.ts,exporters/otel-exporter.ts,services/trace.service.ts,services/logging.service.ts,services/correlation.service.ts,types/trace.types.ts,types/metrics.types.ts,utils/anomaly-algorithms.ts,utils/metric-helpers.ts}
touch packages/aegis-observability/dashboards/{default-dashboard.json,business-metrics-dashboard.json,anomaly-dashboard.json}
touch packages/aegis-observability/{package.json,README.md,tsconfig.json}

mkdir -p packages/aegis-resilience/src/{decorators,services,strategies,state-machine,types,utils}
mkdir -p packages/aegis-resilience/tests
touch packages/aegis-resilience/src/{index.ts,decorators/grpc-call.decorator.ts,decorators/circuit-breaker.decorator.ts,decorators/retry.decorator.ts,services/circuit-breaker.service.ts,services/retry.service.ts,services/health-check.service.ts,strategies/retry.strategy.ts,strategies/backoff.strategy.ts,strategies/fallback.strategy.ts,state-machine/circuit-breaker.state.ts,types/resilience.types.ts,types/circuit-breaker.types.ts,utils/resilience-helpers.ts}
touch packages/aegis-resilience/{package.json,README.md,tsconfig.json}

# Packages - Tier 2
mkdir -p packages/aegis-cache/src/{decorators,services,strategies,types,utils}
mkdir -p packages/aegis-cache/tests
touch packages/aegis-cache/src/{index.ts,decorators/cacheable.decorator.ts,decorators/cache-invalidate.decorator.ts,services/cache.service.ts,services/cache-invalidation.service.ts,services/cache-warming.service.ts,strategies/write-through.strategy.ts,strategies/cache-aside.strategy.ts,strategies/write-behind.strategy.ts,types/cache.types.ts,utils/key-naming.ts,utils/cache-helpers.ts}
touch packages/aegis-cache/{package.json,README.md,tsconfig.json}

mkdir -p packages/aegis-validation/src/{middleware,services,generators,decorators,types,utils}
mkdir -p packages/aegis-validation/tests
touch packages/aegis-validation/src/{index.ts,middleware/validation.middleware.ts,services/zod-validator.service.ts,services/proto-validator.service.ts,services/error-formatter.service.ts,generators/proto-generator.ts,generators/openapi-generator.ts,decorators/validate.decorator.ts,types/validation.types.ts,utils/validation-helpers.ts}
touch packages/aegis-validation/{package.json,README.md,tsconfig.json}

mkdir -p packages/aegis-queue/src/{services,decorators,strategies,types,utils}
mkdir -p packages/aegis-queue/tests
touch packages/aegis-queue/src/{index.ts,services/queue.service.ts,services/dlq-handler.service.ts,services/job-idempotency.service.ts,services/queue-monitor.service.ts,decorators/queue-job.decorator.ts,decorators/idempotent.decorator.ts,strategies/retry-strategy.ts,strategies/classification.strategy.ts,strategies/priority-manager.ts,types/queue.types.ts,types/job.types.ts,utils/queue-helpers.ts}
touch packages/aegis-queue/{package.json,README.md,tsconfig.json}

mkdir -p packages/aegis-security/src/{middleware,services,strategies,types,utils}
mkdir -p packages/aegis-security/tests
touch packages/aegis-security/src/{index.ts,middleware/rate-limiter.middleware.ts,middleware/blacklist.middleware.ts,middleware/risk-scorer.middleware.ts,services/rate-limit.service.ts,services/blacklist.service.ts,services/jwt.service.ts,services/risk-scoring.service.ts,services/step-up-auth.service.ts,strategies/rate-limit-strategy.ts,strategies/jwt-strategy.ts,strategies/risk-strategy.ts,types/security.types.ts,types/risk.types.ts,utils/token-helpers.ts,utils/security-helpers.ts}
touch packages/aegis-security/{package.json,README.md,tsconfig.json}

# Packages - Tier 3
mkdir -p packages/aegis-starter-template/template/{.github/workflows,src/{config,common,health,prisma},prisma/migrations,tests,docs,scripts}
mkdir -p packages/aegis-starter-template/grafana-dashboards
mkdir -p packages/aegis-starter-template/scripts
touch packages/aegis-starter-template/template/{docker-compose.yml,Dockerfile,.dockerignore,.env.example,.env.test,tsconfig.json,tsconfig.build.json,.eslintrc.json,.prettierrc.json,jest.config.js,package.json,.github/PULL_REQUEST_TEMPLATE.md,.github/workflows/ci.yml,.github/workflows/cd.yml,.github/workflows/security.yml,src/main.ts,src/app.module.ts,src/config/database.config.ts,src/config/redis.config.ts,src/config/app.config.ts,src/prisma/schema.prisma,src/prisma/seed.ts}
touch packages/aegis-starter-template/{package.json,README.md,grafana-dashboards/default-dashboard.json,grafana-dashboards/alerts.json,scripts/setup.sh}

mkdir -p packages/aegis-cli/{bin,src/{commands,services,utils,types},templates/project-template,tests}
touch packages/aegis-cli/bin/aegis.js
touch packages/aegis-cli/src/{index.ts,commands/scaffold.command.ts,commands/migrate.command.ts,commands/audit-export.command.ts,commands/health-check.command.ts,commands/benchmark.command.ts,services/project-generator.ts,services/migration-runner.ts,services/benchmark.service.ts,utils/cli-helpers.ts,types/cli.types.ts}
touch packages/aegis-cli/{package.json,README.md,tsconfig.json}

mkdir -p packages/aegis-docs/docs/{guides,api-reference,examples,migration,adr}
mkdir -p packages/aegis-docs/assets/{diagrams,images}
touch packages/aegis-docs/docs/{README.md,getting-started.md,architecture.md,faq.md,guides/setup-guide.md,guides/best-practices.md,guides/troubleshooting.md,guides/performance-tuning.md,guides/security-guide.md,api-reference/audit.md,api-reference/observability.md,api-reference/resilience.md,api-reference/cache.md,api-reference/validation.md,api-reference/queue.md,api-reference/security.md,examples/basic-setup.md,examples/microservices.md,examples/event-driven.md,examples/scaling.md,migration/v0-to-v1.md,migration/upgrade-guide.md,adr/adr-001-library-architecture.md,adr/adr-002-observability-strategy.md,adr/adr-003-cache-invalidation.md}
touch packages/aegis-docs/{package.json,docusaurus.config.js}

# Packages - Tier 4
mkdir -p packages/aegis-testing/src/{jest,decorators,utilities,helpers,types}
mkdir -p packages/aegis-testing/fixtures/test-data
touch packages/aegis-testing/src/{index.ts,jest/jest.config.ts,jest/test-setup.ts,decorators/mock.decorator.ts,decorators/test-db.decorator.ts,utilities/test-database.ts,utilities/test-redis.ts,utilities/mock-factory.ts,utilities/fixtures.ts,helpers/assertion-helpers.ts,helpers/async-helpers.ts,types/testing.types.ts}
touch packages/aegis-testing/{package.json,README.md,tsconfig.json}

mkdir -p packages/aegis-performance/src/{profilers,detectors,tools,reports,types}
mkdir -p packages/aegis-performance/tests
touch packages/aegis-performance/src/{index.ts,profilers/query-profiler.ts,profilers/memory-profiler.ts,profilers/response-profiler.ts,detectors/memory-leak-detector.ts,detectors/performance-regression.ts,tools/load-test-runner.ts,tools/benchmark-analyzer.ts,reports/performance-report.ts,reports/regression-report.ts,types/performance.types.ts}
touch packages/aegis-performance/{package.json,README.md,tsconfig.json}

mkdir -p packages/aegis-migration/src/{services,runners,validators,transformers,types}
mkdir -p packages/aegis-migration/migrations/example
mkdir -p packages/aegis-migration/tests
touch packages/aegis-migration/src/{index.ts,services/migration.service.ts,services/version-manager.ts,services/rollback.service.ts,runners/migration-runner.ts,runners/rollback-runner.ts,validators/migration-validator.ts,validators/schema-validator.ts,transformers/data-transformer.ts,types/migration.types.ts}
touch packages/aegis-migration/{package.json,README.md,tsconfig.json}

# Root docs and scripts
mkdir -p docs
mkdir -p scripts
mkdir -p .github/workflows
mkdir -p .github/ISSUE_TEMPLATE

touch docs/{README.md,CONTRIBUTING.md,CODE_OF_CONDUCT.md,ARCHITECTURE.md,ROADMAP.md,CHANGELOG.md}
touch scripts/{setup.sh,build-all.sh,test-all.sh,publish.sh,version-bump.sh}
touch .github/{PULL_REQUEST_TEMPLATE.md,ISSUE_TEMPLATE/bug_report.md,ISSUE_TEMPLATE/feature_request.md}
touch .github/workflows/{lint.yml,test.yml,build.yml,publish.yml,security.yml}

echo "✅ AEGIS proje yapısı oluşturuldu!"