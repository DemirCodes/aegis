// ═══════════════════════════════════════════════════
// AEGIS — Bot Detection
// İstekler arası milisaniyelik sabit gecikmeleri tespit eder.
// Entropy/Variance Check ile bot davranışı analizi.
// ═══════════════════════════════════════════════════

// ──── TYPES ──────────────────────────────────────

interface BotDetectionResult {
  isBot: boolean;
  confidence: number; // 0-1 arası
  reason?: string;
  indicators: BotIndicator[];
}

interface BotIndicator {
  type: string;
  value: number;
  threshold: number;
  triggered: boolean;
}

interface RequestTiming {
  ip: string;
  timestamps: number[];
  intervals: number[];
}

// ──── IN-MEMORY STORE ────────────────────────────

const requestTimings = new Map<string, RequestTiming>();
const MAX_TIMINGS = 50;
const TIMING_WINDOW_MS = 60 * 1000; // 1 dakika

// ──── BOT INDICATORS ─────────────────────────────

const BOT_INDICATORS = {
  // İstekler arası sabit aralık (botlar genelde sabit hızda çalışır)
  constantInterval: {
    threshold: 0.1, // Standart sapma 100ms'den azsa şüpheli
    weight: 0.3,
  },
  // Çok hızlı istek (insanlar 200ms'den hızlı tıklayamaz)
  tooFast: {
    threshold: 200, // ms
    weight: 0.25,
  },
  // Gece yarısı aktivitesi (çoğu bot gece çalışır)
  nighttimeActivity: {
    threshold: 0.7, // İsteklerin %70'i gece ise
    weight: 0.15,
  },
  // User-Agent yokluğu
  missingUserAgent: {
    threshold: 1,
    weight: 0.15,
  },
  // Headless browser pattern'leri
  headlessPatterns: {
    threshold: 1,
    weight: 0.15,
  },
};

// ═══════════════════════════════════════════════════
// RECORD REQUEST
// ═══════════════════════════════════════════════════

function recordRequest(ip: string): void {
  const now = Date.now();
  let timing = requestTimings.get(ip);

  if (!timing) {
    timing = { ip, timestamps: [], intervals: [] };
    requestTimings.set(ip, timing);
  }

  // Eski kayıtları temizle
  const cutoff = now - TIMING_WINDOW_MS;
  timing.timestamps = timing.timestamps.filter(t => t > cutoff);

  // Yeni timestamp ekle
  if (timing.timestamps.length > 0) {
    const lastTimestamp = timing.timestamps[timing.timestamps.length - 1]!;
    const interval = now - lastTimestamp;
    timing.intervals.push(interval);

    // Çok fazla interval birikmesin
    if (timing.intervals.length > MAX_TIMINGS) {
      timing.intervals.shift();
    }
  }

  timing.timestamps.push(now);

  // Çok fazla timestamp birikmesin
  if (timing.timestamps.length > MAX_TIMINGS) {
    timing.timestamps.shift();
  }
}

// ═══════════════════════════════════════════════════
// DETECT BOT
// ═══════════════════════════════════════════════════

interface DetectBotOptions {
  userAgent?: string;
  currentHour?: number;
}

function detectBot(ip: string, options: DetectBotOptions = {}): BotDetectionResult {
  const timing = requestTimings.get(ip);
  const indicators: BotIndicator[] = [];
  let totalWeight = 0;
  let triggeredWeight = 0;

  // 1. Sabit aralık kontrolü
  if (timing && timing.intervals.length >= 5) {
    const mean = timing.intervals.reduce((sum, v) => sum + v, 0) / timing.intervals.length;
    const variance = timing.intervals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / timing.intervals.length;
    const stdDev = Math.sqrt(variance);
    const isConstant = stdDev < BOT_INDICATORS.constantInterval.threshold;

    indicators.push({
      type: 'constantInterval',
      value: Math.round(stdDev),
      threshold: BOT_INDICATORS.constantInterval.threshold,
      triggered: isConstant,
    });

    if (isConstant) triggeredWeight += BOT_INDICATORS.constantInterval.weight;
    totalWeight += BOT_INDICATORS.constantInterval.weight;
  }

  // 2. Çok hızlı istek kontrolü
  if (timing && timing.intervals.length >= 3) {
    const minInterval = Math.min(...timing.intervals);
    const isTooFast = minInterval < BOT_INDICATORS.tooFast.threshold;

    indicators.push({
      type: 'tooFast',
      value: minInterval,
      threshold: BOT_INDICATORS.tooFast.threshold,
      triggered: isTooFast,
    });

    if (isTooFast) triggeredWeight += BOT_INDICATORS.tooFast.weight;
    totalWeight += BOT_INDICATORS.tooFast.weight;
  }

  // 3. Gece aktivitesi kontrolü
  if (options.currentHour !== undefined) {
    const hour = options.currentHour;
    const isNight = hour >= 0 && hour <= 5; // 00:00 - 05:59

    if (timing && timing.timestamps.length >= 10) {
      const nightCount = timing.timestamps.filter(t => {
        const h = new Date(t).getHours();
        return h >= 0 && h <= 5;
      }).length;
      const nightRatio = nightCount / timing.timestamps.length;
      const isNightActivity = nightRatio > BOT_INDICATORS.nighttimeActivity.threshold;

      indicators.push({
        type: 'nighttimeActivity',
        value: Math.round(nightRatio * 100) / 100,
        threshold: BOT_INDICATORS.nighttimeActivity.threshold,
        triggered: isNightActivity,
      });

      if (isNightActivity) triggeredWeight += BOT_INDICATORS.nighttimeActivity.weight;
      totalWeight += BOT_INDICATORS.nighttimeActivity.weight;
    }
  }

  // 4. User-Agent yokluğu
  if (options.userAgent !== undefined) {
    const isMissing = !options.userAgent || options.userAgent.length === 0;

    indicators.push({
      type: 'missingUserAgent',
      value: isMissing ? 1 : 0,
      threshold: BOT_INDICATORS.missingUserAgent.threshold,
      triggered: isMissing,
    });

    if (isMissing) triggeredWeight += BOT_INDICATORS.missingUserAgent.weight;
    totalWeight += BOT_INDICATORS.missingUserAgent.weight;
  }

  // 5. Headless browser pattern'leri
  if (options.userAgent) {
    const headlessPatterns = [
      'HeadlessChrome',
      'PhantomJS',
      'Selenium',
      'Puppeteer',
      'Playwright',
      'python-requests',
      'curl',
      'wget',
      'axios',
      'node-fetch',
      'Go-http-client',
      'Java/',
    ];

    const isHeadless = headlessPatterns.some(p =>
      options.userAgent!.toLowerCase().includes(p.toLowerCase())
    );

    indicators.push({
      type: 'headlessPatterns',
      value: isHeadless ? 1 : 0,
      threshold: BOT_INDICATORS.headlessPatterns.threshold,
      triggered: isHeadless,
    });

    if (isHeadless) triggeredWeight += BOT_INDICATORS.headlessPatterns.weight;
    totalWeight += BOT_INDICATORS.headlessPatterns.weight;
  }

  // Sonuç
  const confidence = totalWeight > 0 ? triggeredWeight / totalWeight : 0;
  const isBot = confidence >= 0.5;

  let reason: string | undefined;
  if (isBot) {
    const triggeredIndicators = indicators.filter(i => i.triggered).map(i => i.type);
    reason = `Bot indicators triggered: [${triggeredIndicators.join(', ')}]`;
  }

  return {
    isBot,
    confidence: Math.round(confidence * 100) / 100,
    reason,
    indicators,
  };
}

// ═══════════════════════════════════════════════════
// BOT SCORE (Basit)
// ═══════════════════════════════════════════════════

function calculateBotScore(ip: string): number {
  const result = detectBot(ip);
  return result.confidence;
}

// ──── MANAGEMENT ─────────────────────────────────

function clearBotData(): void {
  requestTimings.clear();
}

function getBotStats(): { totalTracked: number; botsDetected: number } {
  let botsDetected = 0;

  for (const [ip] of requestTimings) {
    const result = detectBot(ip);
    if (result.isBot) botsDetected++;
  }

  return {
    totalTracked: requestTimings.size,
    botsDetected,
  };
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  recordRequest,
  detectBot,
  calculateBotScore,
  clearBotData,
  getBotStats,
};

export type {
  BotDetectionResult,
  BotIndicator,
  RequestTiming,
  DetectBotOptions,
};