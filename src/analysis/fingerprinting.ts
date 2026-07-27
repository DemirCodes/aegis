// ═══════════════════════════════════════════════════
// AEGIS — Request Fingerprinting
// İstek pattern'lerini analiz eder.
// Aynı pattern tekrarını tespit eder.
// Headers, body shape, timing analizi.
// ═══════════════════════════════════════════════════

// ──── TYPES ──────────────────────────────────────

interface FingerprintData {
  ip: string;
  userAgent?: string;
  acceptLanguage?: string;
  method: string;
  path: string;
  bodyShape?: string;
}

interface FingerprintResult {
  fingerprint: string;
  isRepeated: boolean;
  count: number;
  firstSeenAt: number;
  lastSeenAt: number;
}

// ──── IN-MEMORY STORE ────────────────────────────

const fingerprintStore = new Map<string, { count: number; firstSeenAt: number; lastSeenAt: number }>();
const FINGERPRINT_WINDOW_MS = 60 * 1000; // 1 dakika
const MAX_FINGERPRINTS = 10000;

// ──── HASHING ────────────────────────────────────

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// ═══════════════════════════════════════════════════
// CREATE FINGERPRINT
// ═══════════════════════════════════════════════════

function createFingerprint(data: FingerprintData): string {
  const parts: string[] = [
    data.ip,
    data.method,
    data.path,
  ];

  if (data.userAgent) {
    parts.push(data.userAgent.slice(0, 100)); // İlk 100 karakter yeterli
  }

  if (data.acceptLanguage) {
    parts.push(data.acceptLanguage.slice(0, 50));
  }

  if (data.bodyShape) {
    parts.push(data.bodyShape);
  }

  return simpleHash(parts.join('|'));
}

// ═══════════════════════════════════════════════════
// ANALYZE FINGERPRINT
// ═══════════════════════════════════════════════════

function analyzeFingerprint(data: FingerprintData): FingerprintResult {
  const fingerprint = createFingerprint(data);
  const now = Date.now();

  // Eski kayıtları temizle (store çok büyürse)
  if (fingerprintStore.size > MAX_FINGERPRINTS) {
    sweepFingerprints(now);
  }

  const existing = fingerprintStore.get(fingerprint);

  if (existing && (now - existing.lastSeenAt) < FINGERPRINT_WINDOW_MS) {
    existing.count++;
    existing.lastSeenAt = now;

    return {
      fingerprint,
      isRepeated: true,
      count: existing.count,
      firstSeenAt: existing.firstSeenAt,
      lastSeenAt: now,
    };
  }

  // Yeni veya süresi geçmiş
  fingerprintStore.set(fingerprint, {
    count: 1,
    firstSeenAt: now,
    lastSeenAt: now,
  });

  return {
    fingerprint,
    isRepeated: false,
    count: 1,
    firstSeenAt: now,
    lastSeenAt: now,
  };
}

// ═══════════════════════════════════════════════════
// BODY SHAPE EXTRACTOR
// ═══════════════════════════════════════════════════

function extractBodyShape(body: unknown): string | undefined {
  if (!body) return undefined;

  if (typeof body === 'object') {
    if (Array.isArray(body)) {
      return `array:${body.length}:${extractBodyShape(body[0])}`;
    }

    const keys = Object.keys(body as Record<string, unknown>).sort();
    return `obj:${keys.join(',')}`;
  }

  return typeof body;
}

// ═══════════════════════════════════════════════════
// FINGERPRINT MATCHING
// ═══════════════════════════════════════════════════

interface FingerprintMatchOptions {
  sameIpOnly?: boolean;
  windowMs?: number;
  minCount?: number;
}

function findMatchingFingerprints(
  fingerprint: string,
  options: FingerprintMatchOptions = {}
): FingerprintResult[] {
  const results: FingerprintResult[] = [];
  const now = Date.now();
  const windowMs = options.windowMs || FINGERPRINT_WINDOW_MS;

  for (const [fp, data] of fingerprintStore) {
    if (options.sameIpOnly) {
      // Aynı IP'den gelenleri bul (fingerprint içinde IP var)
      if (fp === fingerprint && (now - data.lastSeenAt) < windowMs) {
        results.push({
          fingerprint: fp,
          isRepeated: data.count > (options.minCount || 1),
          count: data.count,
          firstSeenAt: data.firstSeenAt,
          lastSeenAt: data.lastSeenAt,
        });
      }
    } else {
      // Benzer fingerprint'leri bul (ilk 10 karakter aynı olanlar)
      if (fp.slice(0, 10) === fingerprint.slice(0, 10) && (now - data.lastSeenAt) < windowMs) {
        results.push({
          fingerprint: fp,
          isRepeated: data.count > (options.minCount || 1),
          count: data.count,
          firstSeenAt: data.firstSeenAt,
          lastSeenAt: data.lastSeenAt,
        });
      }
    }
  }

  return results.sort((a, b) => b.count - a.count);
}

// ═══════════════════════════════════════════════════
// FINGERPRINT RISK SCORE
// ═══════════════════════════════════════════════════

function calculateFingerprintRisk(result: FingerprintResult): 'low' | 'medium' | 'high' {
  if (result.count > 100) return 'high';
  if (result.count > 20) return 'medium';
  return 'low';
}

// ──── SWEEP ──────────────────────────────────────

function sweepFingerprints(now: number = Date.now()): void {
  for (const [key, data] of fingerprintStore) {
    if (now - data.lastSeenAt > FINGERPRINT_WINDOW_MS * 10) {
      fingerprintStore.delete(key);
    }
  }
}

function clearFingerprints(): void {
  fingerprintStore.clear();
}

function getFingerprintCount(): number {
  return fingerprintStore.size;
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  createFingerprint,
  analyzeFingerprint,
  extractBodyShape,
  findMatchingFingerprints,
  calculateFingerprintRisk,
  sweepFingerprints,
  clearFingerprints,
  getFingerprintCount,
};

export type {
  FingerprintData,
  FingerprintResult,
  FingerprintMatchOptions,
};