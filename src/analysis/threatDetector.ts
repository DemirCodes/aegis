// ═══════════════════════════════════════════════════
// AEGIS — Threat Detector
// İstek analizi, IP blacklist, şüpheli pattern tespiti.
// ═══════════════════════════════════════════════════

import type { ThreatInfo } from '../types.js';

// ──── IN-MEMORY STORE ────────────────────────────

const threatBlacklist = new Map<string, number>(); // ip -> ban bitiş zamanı
const threatHistory = new Map<string, number[]>(); // ip -> istek zamanları

const DEFAULT_BAN_DURATION_MS = 10 * 60 * 1000; // 10 dakika
const THREAT_HISTORY_WINDOW_MS = 60 * 1000; // 1 dakika
const MAX_REQUESTS_PER_WINDOW = 100; // 1 dakikada max 100 istek
const THREAT_ENTRY_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 saat

// ──── SUSPICIOUS PATTERNS ────────────────────────

const SUSPICIOUS_PATTERNS = [
  /(\bUNION\b.*\bSELECT\b|\bSELECT\b.*\bFROM\b)/i, // SQLi
  /(<script[\s>]|javascript:|on\w+\s*=)/i,           // XSS
  /(\.\.\/|\.\.\\)/i,                                 // Path traversal
  /(\bexec\b.*\(|\bsystem\b.*\()/i,                  // Command injection
  /(\$\{.*\}|\{\{.*\}\})/i,                           // Template injection
];

// ──── SÜPÜRME ────────────────────────────────────

function sweepStaleThreats(now: number = Date.now()): void {
  for (const [ip, bannedUntil] of threatBlacklist) {
    if (now > bannedUntil + THREAT_ENTRY_MAX_AGE_MS) {
      threatBlacklist.delete(ip);
    }
  }

  for (const [ip, timestamps] of threatHistory) {
    const recent = timestamps.filter(t => now - t < THREAT_HISTORY_WINDOW_MS);
    if (recent.length === 0) {
      threatHistory.delete(ip);
    } else {
      threatHistory.set(ip, recent);
    }
  }
}

// ═══════════════════════════════════════════════════
// ANALYZE REQUEST
// ═══════════════════════════════════════════════════

interface RequestInfo {
  ip: string;
  path: string;
  method: string;
  headers?: Record<string, string>;
}

function analyzeRequest(req: RequestInfo): ThreatInfo {
  const { ip, path, method } = req;
  const now = Date.now();

  // ──── Blacklist kontrolü ───────────────────────

  const bannedUntil = threatBlacklist.get(ip);
  if (bannedUntil && now < bannedUntil) {
    const remainingSec = Math.ceil((bannedUntil - now) / 1000);
    return {
      ip,
      suspicious: true,
      reason: `IP blacklisted. Remaining: ${remainingSec}s`,
    };
  }

  // ──── Rate kontrolü ────────────────────────────

  const timestamps = threatHistory.get(ip) || [];
  const recentRequests = timestamps.filter(t => now - t < THREAT_HISTORY_WINDOW_MS);

  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    blockRequest(ip);
    return {
      ip,
      suspicious: true,
      reason: `Request threshold exceeded: ${recentRequests.length}/${MAX_REQUESTS_PER_WINDOW} in ${THREAT_HISTORY_WINDOW_MS / 1000}s`,
    };
  }

  // ──── Pattern kontrolü ─────────────────────────

  const fullPath = `${method} ${path}`;

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(fullPath)) {
      blockRequest(ip, 30 * 60 * 1000); // 30 dakika ban
      return {
        ip,
        suspicious: true,
        reason: `Suspicious pattern detected: ${pattern.source}`,
      };
    }
  }

  // ──── Temiz istek ──────────────────────────────

  // Kaydet
  threatHistory.set(ip, [...recentRequests, now]);

  return { ip, suspicious: false };
}

// ═══════════════════════════════════════════════════
// BLOCK / UNBLOCK
// ═══════════════════════════════════════════════════

function blockRequest(ip: string, durationMs: number = DEFAULT_BAN_DURATION_MS): void {
  threatBlacklist.set(ip, Date.now() + durationMs);
}

function unblockRequest(ip: string): void {
  threatBlacklist.delete(ip);
}

function isBlocked(ip: string): boolean {
  const bannedUntil = threatBlacklist.get(ip);
  return !!bannedUntil && Date.now() < bannedUntil;
}

function getBlockedIPs(): string[] {
  const now = Date.now();
  return Array.from(threatBlacklist.entries())
    .filter(([_, until]) => now < until)
    .map(([ip]) => ip);
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  analyzeRequest,
  blockRequest,
  unblockRequest,
  isBlocked,
  getBlockedIPs,
  sweepStaleThreats,
};

export type { RequestInfo };