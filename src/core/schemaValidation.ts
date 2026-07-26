// ═══════════════════════════════════════════════════
// AEGIS — Schema Validation
// Payload'u Zod/Joi şeması ile doğrular.
// Geçemeyen istekler iç katmanlara ulaşamaz.
// ═══════════════════════════════════════════════════

// ──── SCHEMA INTERFACE ────────────────────────────

interface SchemaLike {
  parse(data: unknown): unknown;
  safeParse(data: unknown): { success: boolean; data?: unknown; error?: unknown };
}

// ═══════════════════════════════════════════════════
// WITH SCHEMA VALIDATION
// ═══════════════════════════════════════════════════

function withSchemaValidation<T>(
  schema: SchemaLike,
  fn: (data: unknown) => Promise<T>
): (data: unknown) => Promise<T> {
  return (data: unknown) => {
    try {
      const parsed = schema.parse(data);
      return fn(parsed);
    } catch (error: any) {
      return Promise.reject(new Error(`Schema validation failed: ${error?.message || 'Invalid data'}`));
    }
  };
}

// ═══════════════════════════════════════════════════
// WITH SCHEMA VALIDATION (Safe Parse)
// ═══════════════════════════════════════════════════

function withSchemaValidationSafe<T>(
  schema: SchemaLike,
  fn: (data: unknown) => Promise<T>
): (data: unknown) => Promise<T> {
  return (data: unknown) => {
    const result = schema.safeParse(data);

    if (!result.success) {
      return Promise.reject(new Error(`Schema validation failed: ${JSON.stringify(result.error)}`));
    }

    return fn(result.data);
  };
}

// ═══════════════════════════════════════════════════
// VALIDATION RESULT TYPE
// ═══════════════════════════════════════════════════

interface ValidationResult {
  valid: boolean;
  data?: unknown;
  errors?: string[];
}

function validateSchema(schema: SchemaLike, data: unknown): ValidationResult {
  try {
    const parsed = schema.parse(data);
    return { valid: true, data: parsed };
  } catch (error: any) {
    const errors: string[] = [];

    if (error?.issues && Array.isArray(error.issues)) {
      // Zod format
      for (const issue of error.issues) {
        errors.push(`${issue.path?.join('.') || 'root'}: ${issue.message}`);
      }
    } else {
      errors.push(error?.message || 'Invalid data');
    }

    return { valid: false, errors };
  }
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  withSchemaValidation,
  withSchemaValidationSafe,
  validateSchema,
};

export type { SchemaLike, ValidationResult };