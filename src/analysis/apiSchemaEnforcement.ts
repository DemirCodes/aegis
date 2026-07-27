// ═══════════════════════════════════════════════════
// AEGIS — API Schema Enforcement
// OpenAPI/JSON Schema zorunluluğu.
// Şemaya uymayan istekler reddedilir.
// ═══════════════════════════════════════════════════

// ──── TYPES ──────────────────────────────────────

type SchemaFormat = 'openapi' | 'json-schema' | 'zod';

interface SchemaEnforcementOptions {
  format?: SchemaFormat;
  strict?: boolean;         // Bilinmeyen property'leri reddet
  coerce?: boolean;          // Tip dönüşümüne izin ver
  onViolation?: (errors: SchemaViolation[]) => void;
}

interface SchemaViolation {
  path: string;
  message: string;
  expected?: string;
  received?: string;
}

interface SchemaCheckResult {
  valid: boolean;
  violations: SchemaViolation[];
  sanitized?: unknown;
}

// ──── SIMPLE JSON SCHEMA VALIDATOR ───────────────

interface JsonSchema {
  type?: string | string[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  additionalProperties?: boolean;
  nullable?: boolean;
}

// ═══════════════════════════════════════════════════
// SCHEMA VALIDATOR
// ═══════════════════════════════════════════════════

class SchemaEnforcer {
  private options: SchemaEnforcementOptions;

  constructor(options: SchemaEnforcementOptions = {}) {
    this.options = {
      strict: true,
      coerce: false,
      ...options,
    };
  }

  // ══════════════════════════════════════════════

  /**
   * Request body'yi şemaya karşı kontrol et
   */
  enforce(
    data: unknown,
    schema: JsonSchema | unknown,
    path: string = ''
  ): SchemaCheckResult {
    const violations: SchemaViolation[] = [];

    try {
      if (this.options.format === 'zod') {
        // Zod schema — parse et
        const zodSchema = schema as { safeParse: (data: unknown) => { success: boolean; error?: { issues: Array<{ path: (string | number)[]; message: string }> } } };
        const result = zodSchema.safeParse(data);

        if (!result.success && result.error) {
          for (const issue of result.error.issues) {
            violations.push({
              path: issue.path.join('.') || path,
              message: issue.message,
            });
          }
        }

        return { valid: violations.length === 0, violations, sanitized: result.success ? data : undefined };
      }

      // JSON Schema validation
      const jsonSchema = schema as JsonSchema;
      this.validateJsonSchema(data, jsonSchema, path, violations);

    } catch (error: any) {
      violations.push({
        path,
        message: `Schema validation error: ${error?.message || 'Unknown error'}`,
      });
    }

    const valid = violations.length === 0;

    if (!valid && this.options.onViolation) {
      this.options.onViolation(violations);
    }

    return { valid, violations };
  }

  // ══════════════════════════════════════════════

  /**
   * Express/Koa middleware
   */
  middleware(schema: JsonSchema | unknown) {
    return (req: { body: unknown; path: string; method: string }): SchemaCheckResult => {
      return this.enforce(req.body, schema, req.path);
    };
  }

  // ══════════════════════════════════════════════

  private validateJsonSchema(
    data: unknown,
    schema: JsonSchema,
    path: string,
    violations: SchemaViolation[]
  ): void {
    if (schema.nullable && data === null) return;

    // Type check
    if (schema.type && data !== undefined) {
      const actualType = Array.isArray(data) ? 'array' : typeof data;

      if (typeof schema.type === 'string') {
        if (actualType !== schema.type) {
          violations.push({
            path,
            message: `Type mismatch`,
            expected: schema.type,
            received: actualType,
          });
          return;
        }
      } else if (Array.isArray(schema.type)) {
        if (!schema.type.includes(actualType)) {
          violations.push({
            path,
            message: `Type mismatch`,
            expected: schema.type.join(' | '),
            received: actualType,
          });
          return;
        }
      }
    }

    // Required fields
    if (schema.required && typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      for (const requiredField of schema.required) {
        if (!(requiredField in obj) || obj[requiredField] === undefined) {
          violations.push({
            path: path ? `${path}.${requiredField}` : requiredField,
            message: `Required field missing`,
          });
        }
      }
    }

    // Properties
    if (schema.properties && typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;

      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in obj) {
          this.validateJsonSchema(
            obj[key],
            propSchema,
            path ? `${path}.${key}` : key,
            violations
          );
        }
      }

      // Additional properties (strict mode)
      if (this.options.strict && schema.additionalProperties === false) {
        const allowedKeys = Object.keys(schema.properties);
        for (const key of Object.keys(obj)) {
          if (!allowedKeys.includes(key)) {
            violations.push({
              path: path ? `${path}.${key}` : key,
              message: `Unexpected property`,
            });
          }
        }
      }
    }

    // Array items
    if (schema.items && Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        this.validateJsonSchema(
          data[i],
          schema.items,
          `${path}[${i}]`,
          violations
        );
      }
    }

    // String constraints
    if (typeof data === 'string') {
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        violations.push({
          path,
          message: `String too short`,
          expected: `>= ${schema.minLength}`,
          received: `${data.length}`,
        });
      }
      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        violations.push({
          path,
          message: `String too long`,
          expected: `<= ${schema.maxLength}`,
          received: `${data.length}`,
        });
      }
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(data)) {
          violations.push({
            path,
            message: `Pattern mismatch`,
            expected: schema.pattern,
            received: data.slice(0, 100),
          });
        }
      }
      if (schema.format === 'email' && !isValidEmail(data)) {
        violations.push({ path, message: 'Invalid email format' });
      }
      if (schema.format === 'uri' && !isValidURI(data)) {
        violations.push({ path, message: 'Invalid URI format' });
      }
      if (schema.format === 'date-time' && !isValidDateTime(data)) {
        violations.push({ path, message: 'Invalid date-time format' });
      }
    }

    // Number constraints
    if (typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        violations.push({
          path,
          message: `Number too small`,
          expected: `>= ${schema.minimum}`,
          received: `${data}`,
        });
      }
      if (schema.maximum !== undefined && data > schema.maximum) {
        violations.push({
          path,
          message: `Number too large`,
          expected: `<= ${schema.maximum}`,
          received: `${data}`,
        });
      }
    }

    // Enum
    if (schema.enum && data !== undefined) {
      if (!schema.enum.includes(data)) {
        violations.push({
          path,
          message: `Value not in enum`,
          expected: schema.enum.join(' | '),
          received: String(data),
        });
      }
    }
  }
}

// ═══════════════════════════════════════════════════
// FORMAT VALIDATORS
// ═══════════════════════════════════════════════════

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidURI(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isValidDateTime(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime());
}

// ═══════════════════════════════════════════════════
// COMMON SCHEMAS
// ═══════════════════════════════════════════════════

const COMMON_SCHEMAS = {
  pagination: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
  idParam: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
  emptyResponse: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
};

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  SchemaEnforcer,
  isValidEmail,
  isValidURI,
  isValidDateTime,
  COMMON_SCHEMAS,
};

export type {
  SchemaFormat,
  SchemaEnforcementOptions,
  SchemaViolation,
  SchemaCheckResult,
  JsonSchema,
};