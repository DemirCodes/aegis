// ============================================
// @aegis/core - Common Helpers
// ============================================

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function toJSON(data: any, options?: { pretty?: boolean; maxDepth?: number }): string {
  try {
    const seen = new WeakSet();
    return JSON.stringify(
      data,
      (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      },
      options?.pretty ? 2 : undefined,
    );
  } catch (error) {
    return String(data);
  }
}