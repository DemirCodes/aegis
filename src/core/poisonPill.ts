// ═══════════════════════════════════════════════════
// AEGIS — Poison Pill Protection
// Zararlı payload'ları (XML Bomb, ReDoS, dev JSON) 
// ana thread'e girmeden yakalar.
// ═══════════════════════════════════════════════════

// ──── TYPES ──────────────────────────────────────

interface PoisonPillOptions {
  maxPayloadSize?: number;
  maxParseTimeMs?: number;
  maxDepth?: number;
  maxArrayLength?: number;
}

// ──── REGEX PATTERNLERİ ──────────────────────────

const REDOS_PATTERNS = [
  /([a-zA-Z]+)*$/,
  /(a+)+$/,
  /(a|aa)+$/,
  /(a|a?)+$/,
  /((\s*\w+)*)+$/,
];

const XML_BOMB_PATTERN = /<!ENTITY\s+\w+\s+".*".*>/;
const ENTITY_EXPANSION_PATTERN = /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/;

// ═══════════════════════════════════════════════════
// DETECT POISON PILL
// ═══════════════════════════════════════════════════

function detectPoisonPill(data: unknown, options: PoisonPillOptions = {}): { safe: boolean; reason?: string } {
  const maxPayloadSize = options.maxPayloadSize ?? 5 * 1024 * 1024; // 5MB default
  const maxParseTimeMs = options.maxParseTimeMs ?? 5000;
  const maxDepth = options.maxDepth ?? 100;
  const maxArrayLength = options.maxArrayLength ?? 100000;

  // ──── String kontrolü ──────────────────────────

  if (typeof data === 'string') {
    // Boyut kontrolü
    if (Buffer.byteLength(data, 'utf-8') > maxPayloadSize) {
      return { safe: false, reason: `Payload exceeds max size: ${maxPayloadSize} bytes` };
    }

    // XML Bomb kontrolü
    if (XML_BOMB_PATTERN.test(data)) {
      return { safe: false, reason: 'Potential XML Bomb detected' };
    }

    if (ENTITY_EXPANSION_PATTERN.test(data)) {
      return { safe: false, reason: 'Potential entity expansion attack detected' };
    }

    // ReDoS kontrolü — şüpheli regex pattern'leri
    const startCheck = Date.now();
    for (const pattern of REDOS_PATTERNS) {
      try {
        pattern.test(data.slice(0, 1000)); // Sadece ilk 1000 karakteri kontrol et
        if (Date.now() - startCheck > 100) {
          return { safe: false, reason: 'Potential ReDoS attack detected' };
        }
      } catch {
        return { safe: false, reason: 'Regex evaluation failed — potential ReDoS' };
      }
    }
  }

  // ──── Object/Array derinlik kontrolü ────────────

  if (typeof data === 'object' && data !== null) {
    const startCheck = Date.now();

    try {
      const depth = getDepth(data, 0);
      if (depth > maxDepth) {
        return { safe: false, reason: `Object depth ${depth} exceeds max: ${maxDepth}` };
      }
    } catch {
      return { safe: false, reason: 'Depth check failed — potential circular reference' };
    }

    if (Date.now() - startCheck > 100) {
      return { safe: false, reason: 'Depth check timeout — potential attack' };
    }

    // Array boyut kontrolü
    if (Array.isArray(data) && data.length > maxArrayLength) {
      return { safe: false, reason: `Array length ${data.length} exceeds max: ${maxArrayLength}` };
    }

    // JSON stringify boyutu
    try {
      const jsonStr = JSON.stringify(data);
      if (Buffer.byteLength(jsonStr, 'utf-8') > maxPayloadSize) {
        return { safe: false, reason: `Serialized payload exceeds max size` };
      }
      if (Date.now() - startCheck > maxParseTimeMs) {
        return { safe: false, reason: 'JSON serialization timeout — potential attack' };
      }
    } catch {
      return { safe: false, reason: 'JSON serialization failed — potential circular reference' };
    }
  }

  return { safe: true };
}

// ──── YARDIMCI ──────────────────────────────────

function getDepth(obj: unknown, currentDepth: number, seen = new WeakSet()): number {
  if (currentDepth > 1000) return currentDepth; // Güvenlik limiti

  if (typeof obj !== 'object' || obj === null) return currentDepth;

  // Circular reference kontrolü
  if (seen.has(obj as object)) return currentDepth;
  seen.add(obj as object);

  let maxDepth = currentDepth;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const depth = getDepth(item, currentDepth + 1, seen);
      if (depth > maxDepth) maxDepth = depth;
    }
  } else {
    for (const value of Object.values(obj as Record<string, unknown>)) {
      const depth = getDepth(value, currentDepth + 1, seen);
      if (depth > maxDepth) maxDepth = depth;
    }
  }

  return maxDepth;
}

// ═══════════════════════════════════════════════════
// WITH POISON PILL
// ═══════════════════════════════════════════════════

function withPoisonPill<T>(
  fn: (data: unknown) => Promise<T>,
  options?: PoisonPillOptions
): (data: unknown) => Promise<T> {
  return (data: unknown) => {
    const check = detectPoisonPill(data, options);

    if (!check.safe) {
      return Promise.reject(new Error(`Poison pill detected: ${check.reason}`));
    }

    return fn(data);
  };
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  detectPoisonPill,
  withPoisonPill,
};

export type { PoisonPillOptions };