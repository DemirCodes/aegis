// ═══════════════════════════════════════════════════
// AEGIS — Geo Fencing
// Ülke/bölge bazlı erişim kontrolü.
// IP'den ülke tespiti ve izin/kısıtlama.
// ═══════════════════════════════════════════════════

// ──── TYPES ──────────────────────────────────────

interface GeoResult {
  ip: string;
  country: string | null;
  region: string | null;
  allowed: boolean;
  reason?: string;
}

interface GeoOptions {
  allowedCountries?: string[];
  blockedCountries?: string[];
  defaultAction?: 'allow' | 'deny';
}

// ──── COUNTRY DATA (Minimal embedded) ────────────

// Bu mapping production'da MaxMind GeoIP gibi bir servisle değiştirilmeli
const IP_RANGES: { range: [number, number]; country: string }[] = [
  // US
  { range: [ipToInt('3.0.0.0'), ipToInt('3.255.255.255')], country: 'US' },
  { range: [ipToInt('4.0.0.0'), ipToInt('4.255.255.255')], country: 'US' },
  // UK
  { range: [ipToInt('2.16.0.0'), ipToInt('2.23.255.255')], country: 'GB' },
  // DE
  { range: [ipToInt('2.24.0.0'), ipToInt('2.27.255.255')], country: 'DE' },
  // FR
  { range: [ipToInt('2.0.0.0'), ipToInt('2.15.255.255')], country: 'FR' },
  // TR
  { range: [ipToInt('5.24.0.0'), ipToInt('5.27.255.255')], country: 'TR' },
  { range: [ipToInt('31.0.0.0'), ipToInt('31.255.255.255')], country: 'TR' },
  { range: [ipToInt('78.160.0.0'), ipToInt('78.191.255.255')], country: 'TR' },
  { range: [ipToInt('88.224.0.0'), ipToInt('88.255.255.255')], country: 'TR' },
  { range: [ipToInt('95.0.0.0'), ipToInt('95.15.255.255')], country: 'TR' },
  // JP
  { range: [ipToInt('1.0.16.0'), ipToInt('1.0.31.255')], country: 'JP' },
  // CN
  { range: [ipToInt('1.0.1.0'), ipToInt('1.0.3.255')], country: 'CN' },
  // Private/Localhost
  { range: [ipToInt('127.0.0.0'), ipToInt('127.255.255.255')], country: 'LOCAL' },
  { range: [ipToInt('10.0.0.0'), ipToInt('10.255.255.255')], country: 'LOCAL' },
  { range: [ipToInt('172.16.0.0'), ipToInt('172.31.255.255')], country: 'LOCAL' },
  { range: [ipToInt('192.168.0.0'), ipToInt('192.168.255.255')], country: 'LOCAL' },
];

// ═══════════════════════════════════════════════════
// IP HELPERS
// ═══════════════════════════════════════════════════

function ipToInt(ip: string): number {
  const parts = ip.split('.');
  return (
    (parseInt(parts[0]!, 10) << 24) +
    (parseInt(parts[1]!, 10) << 16) +
    (parseInt(parts[2]!, 10) << 8) +
    parseInt(parts[3]!, 10)
  ) >>> 0;
}

function isValidIP(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255 && String(num) === part;
  });
}

// ═══════════════════════════════════════════════════
// GEO LOOKUP
// ═══════════════════════════════════════════════════

function lookupCountry(ip: string): string | null {
  if (!isValidIP(ip)) return null;

  const intIP = ipToInt(ip);

  for (const range of IP_RANGES) {
    if (intIP >= range.range[0] && intIP <= range.range[1]) {
      return range.country;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════
// GEO FENCING
// ═══════════════════════════════════════════════════

function checkGeo(
  ip: string,
  options: GeoOptions = {}
): GeoResult {
  const country = lookupCountry(ip);
  const defaultAction = options.defaultAction || 'allow';

  const result: GeoResult = {
    ip,
    country,
    region: null,
    allowed: defaultAction === 'allow',
  };

  // Localhost her zaman izinli
  if (country === 'LOCAL') {
    result.allowed = true;
    return result;
  }

  // Whitelist kontrolü
  if (options.allowedCountries && options.allowedCountries.length > 0) {
    if (country && options.allowedCountries.includes(country)) {
      result.allowed = true;
    } else {
      result.allowed = false;
      result.reason = `Country "${country || 'UNKNOWN'}" not in allowed list: [${options.allowedCountries.join(', ')}]`;
    }
  }

  // Blacklist kontrolü (whitelist varsa blacklist'e bakma)
  if (!options.allowedCountries && options.blockedCountries && options.blockedCountries.length > 0) {
    if (country && options.blockedCountries.includes(country)) {
      result.allowed = false;
      result.reason = `Country "${country}" is blocked`;
    } else {
      result.allowed = true;
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════
// GEO MIDDLEWARE HELPER
// ═══════════════════════════════════════════════════

function createGeoMiddleware(options: GeoOptions) {
  return (ip: string): GeoResult => {
    return checkGeo(ip, options);
  };
}

// ──── REGION DATA (Placeholder) ──────────────────

function lookupRegion(ip: string): string | null {
  // Production'da GeoIP2 City database kullanılmalı
  const country = lookupCountry(ip);
  if (!country || country === 'LOCAL') return null;
  return null; // Embedded veritabanında region yok
}

// ──── DISTANCE CALC (Placeholder) ────────────────

function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  // Haversine formula
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  checkGeo,
  lookupCountry,
  lookupRegion,
  createGeoMiddleware,
  calculateDistance,
  isValidIP,
  ipToInt,
};

export type {
  GeoResult,
  GeoOptions,
};