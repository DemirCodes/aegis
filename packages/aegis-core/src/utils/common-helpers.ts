// ============================================
// @aegis/core - Common Helpers
// ============================================

const delayCache = new Map<number, Promise<void>>();

export function delay(ms: number): Promise<void> {
  // Aynı ms için cache'lenmiş promise dön (memory optimization)
  if (!delayCache.has(ms)) {
    delayCache.set(ms, new Promise((resolve) => setTimeout(resolve, ms)));
    // 60 saniye sonra cache'ten temizle
    setTimeout(() => delayCache.delete(ms), 60000);
  }
  return delayCache.get(ms)!;
}


// Object'i JSON string'e dönüştür (circular ref. handle).
export function toJSON(data: any, options?: { pretty?: boolean; maxDepth?: number }): string {
  try {
    const seen = new WeakMap<any, boolean>();
    const maxDepth = options?.maxDepth ?? Infinity;
    
    function serialize(obj: any, currentDepth: number = 0): any {
      // Max depth kontrolü
      if (currentDepth > maxDepth) {
        return '[MaxDepth Reached]';
      }
      
      // null
      if (obj === null) return null;
      
      // BigInt ve Symbol
      if (typeof obj === 'bigint') return obj.toString();
      if (typeof obj === 'symbol') return obj.toString();
      
      // Primitive değerler
      if (typeof obj !== 'object') return obj;
      
      // Döngüsel referans
      if (seen.has(obj)) return '[Circular]';
      seen.set(obj, true);
      
      // Özel tipler
      if (obj instanceof Date) return obj.toISOString();
      if (obj instanceof RegExp) return obj.toString();
      if (obj instanceof Map) {
        const result: any = {};
        obj.forEach((value, key) => {
          result[String(key)] = serialize(value, currentDepth + 1);
        });
        return result;
      }
      if (obj instanceof Set) {
        return Array.from(obj).map(item => serialize(item, currentDepth + 1));
      }
      if (typeof obj.toJSON === 'function') return obj.toJSON();
      
      // Array
      if (Array.isArray(obj)) {
        return obj.map(item => serialize(item, currentDepth + 1));
      }
      
      // Normal obje
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          result[key] = serialize(obj[key], currentDepth + 1);
        }
      }
      return result;
    }
    
    const serialized = serialize(data);
    return JSON.stringify(serialized, null, options?.pretty ? 2 : undefined);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`toJSON serialization failed: ${errorMessage}`, data);
    
    return JSON.stringify({ 
      error: 'Serialization failed', 
      message: errorMessage,
      type: typeof data 
    });
  }
}


