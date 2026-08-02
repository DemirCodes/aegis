# @aegis/core

Shared utilities, types, constants, and error handling for AEGIS framework.

---

## 📁 Project Structure

```
src/
├── index.ts                          # Main entry point (exports all)
├── types/
│   ├── index.ts                      # Type exports
│   ├── common.types.ts               # Common TypeScript types
│   └── errors.types.ts              # Error-related types
├── utils/
│   ├── index.ts                      # Utility exports
│   ├── logger.ts                     # Winston-based logger
│   ├── error-handler.ts             # Error handling utilities
│   ├── env-loader.ts                # Environment variable loader
│   ├── common-helpers.ts            # General helper functions
│   ├── id-generator.ts              # ID generation utilities
│   └── retry.ts                     # Retry mechanism
├── constants/
│   ├── index.ts                      # Constant exports
│   ├── app-constants.ts             # Application constants
│   └── error-codes.ts              # Error code constants
├── errors/
│   ├── index.ts                      # Error exports
│   ├── app-error.ts                 # Base AppError class
│   ├── validation-error.ts          # ValidationError class
│   └── error-codes.ts              # Error codes enum
└── decorators/
    └── deprecated.decorator.ts      # @Deprecated decorator
```

---

## 📦 Modules

### Types (`src/types/`)

| File | Description | Exports |
|------|-------------|---------|
| `common.types.ts` | Common type definitions | `PaginationOptions`, `PaginatedResult<T>`, `ApiResponse<T>`, `ApiError`, `Timestamps`, `Status`, `AuditMetadata`, `DatabaseConfig`, `RedisConfig` |
| `errors.types.ts` | Error type definitions | `AppErrorType`, `ErrorContext` |

### Utils (`src/utils/`)

| File | Description | Exports |
|------|-------------|---------|
| `logger.ts` | Winston-based logging | `createLogger(name, options?)`, `logger` |
| `error-handler.ts` | Error handling | `AppError`, `handleError(error, context?)` |
| `env-loader.ts` | .env file loader | `loadEnv(envFilePath?)` |
| `common-helpers.ts` | General helpers | `delay(ms)`, `toJSON(data, options?)` |
| `id-generator.ts` | ID generation | `generateId(prefix?, length?)`, `generateUUID()` |
| `retry.ts` | Retry logic | `retry(fn, options?)` |

### Constants (`src/constants/`)

| File | Description | Exports |
|------|-------------|---------|
| `app-constants.ts` | App metadata & HTTP status | `APP_NAME`, `APP_VERSION`, `DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE`, `DEFAULT_CACHE_TTL`, `HTTP_STATUS` |
| `error-codes.ts` | Error code constants | `ErrorCodes` |

### Errors (`src/errors/`)

| File | Description | Exports |
|------|-------------|---------|
| `app-error.ts` | Base application error | `AppError` |
| `validation-error.ts` | Validation error | `ValidationError` |
| `error-codes.ts` | Error codes enum | `ErrorCodes` |

### Decorators (`src/decorators/`)

| File | Description | Exports |
|------|-------------|---------|
| `deprecated.decorator.ts` | Mark methods as deprecated | `@Deprecated(message?)` |

---

## 🚀 Usage

```typescript
import {
  // Logger
  createLogger,
  logger,

  // Error handling
  AppError,
  ValidationError,
  handleError,

  // Helpers
  generateId,
  generateUUID,
  delay,
  retry,
  toJSON,
  loadEnv,

  // Constants
  HTTP_STATUS,
  ErrorCodes,

  // Decorators
  Deprecated,

  // Types
  PaginationOptions,
  PaginatedResult,
  ApiResponse,
} from '@aegis/core';
```

### Examples

```typescript
// Logger
const log = createLogger('user-service');
log.info('User created', { userId: '123' });
log.error('Failed to create user', new Error('DB error'));

// ID Generation
const userId = generateId('user');        // user_a1b2c3d4e5f6
const uuid = generateUUID();              // 550e8400-e29b-41d4-a716-446655440000

// Delay
await delay(5000);                        // Wait 5 seconds

// Retry
const data = await retry(
  () => fetch('https://api.example.com'),
  { maxRetries: 3, backoffStrategy: 'exponential' }
);

// Error handling
throw new AppError('NOT_FOUND', 'User not found', 404);
throw new ValidationError('Invalid input', [
  { path: 'email', message: 'Invalid email', code: 'INVALID_EMAIL' }
]);

// Environment
loadEnv();                                 // Load .env file
console.log(process.env.DATABASE_URL);

// Decorators
class OldService {
  @Deprecated('Use NewService instead')
  oldMethod() { }
}
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Log level (`debug`, `info`, `warn`, `error`) |
| `NODE_ENV` | `development` | Environment mode |

### Logger Options

```typescript
const log = createLogger('my-app', {
  level: 'debug',           // debug | info | warn | error
  format: 'pretty',         // pretty | json
});
```

---

## 📦 Dependencies

- **winston** - Logging framework
- **zod** - Schema validation
- **dotenv** - Environment loading
- **uuid** - UUID generation

---

## 📄 License

MIT - AEGIS Framework