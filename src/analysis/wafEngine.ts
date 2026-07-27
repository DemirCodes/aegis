// ═══════════════════════════════════════════════════
// AEGIS — WAF Engine
// OWASP kurallarını uygulama katmanında çalıştırır.
// SQLi, XSS, Command Injection, LFI/RFI tespiti.
// ═══════════════════════════════════════════════════

// ──── TYPES ──────────────────────────────────────

type WAFSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type WAFAction = 'BLOCK' | 'LOG' | 'ALERT';

interface WAFRule {
  id: string;
  name: string;
  severity: WAFSeverity;
  action: WAFAction;
  patterns: RegExp[];
  description: string;
}

interface WAFResult {
  blocked: boolean;
  matchedRules: WAFMatch[];
  totalChecks: number;
}

interface WAFMatch {
  rule: WAFRule;
  matchedPattern: string;
  matchedValue: string;
}

interface WAFOptions {
  rules?: WAFRule[];
  defaultAction?: WAFAction;
  maxRequestSize?: number;
}

// ═══════════════════════════════════════════════════
// OWASP CORE RULE SET (Özet)
// ═══════════════════════════════════════════════════

const OWASP_RULES: WAFRule[] = [
  // ──── SQL Injection ───────────────────────────
  {
    id: 'SQLI-001',
    name: 'SQL Injection — UNION SELECT',
    severity: 'CRITICAL',
    action: 'BLOCK',
    patterns: [
      /(\bUNION\b.*\bSELECT\b|\bSELECT\b.*\bFROM\b.*\bUNION\b)/i,
      /(\bUNION\s+(ALL\s+)?SELECT\b)/i,
    ],
    description: 'Potential SQL UNION injection detected',
  },
  {
    id: 'SQLI-002',
    name: 'SQL Injection — Comments',
    severity: 'HIGH',
    action: 'BLOCK',
    patterns: [
      /(\bOR\b|\bAND\b)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?\s*(--|#|\/\*)/i,
      /'.*(\bOR\b|\bAND\b).*'.*--/i,
    ],
    description: 'SQL injection with comment sequence',
  },
  {
    id: 'SQLI-003',
    name: 'SQL Injection — System Tables',
    severity: 'CRITICAL',
    action: 'BLOCK',
    patterns: [
      /(\binformation_schema\b|\bsys\.\b|\bmaster\.\.\b|\bmsdb\b)/i,
      /(\bsqlite_master\b|\bpg_catalog\b|\bmysql\.\b)/i,
    ],
    description: 'Access to system/database metadata tables',
  },
  {
    id: 'SQLI-004',
    name: 'SQL Injection — Hex Encoding',
    severity: 'HIGH',
    action: 'BLOCK',
    patterns: [
      /0x[0-9a-fA-F]{8,}/,
      /CHAR\(\d+\)/i,
    ],
    description: 'SQL injection using hex encoded strings',
  },

  // ──── XSS ─────────────────────────────────────
  {
    id: 'XSS-001',
    name: 'XSS — Script Tags',
    severity: 'CRITICAL',
    action: 'BLOCK',
    patterns: [
      /<script[\s>]/i,
      /<\/script>/i,
      /javascript:/i,
    ],
    description: 'Cross-site scripting via script tag or javascript: URI',
  },
  {
    id: 'XSS-002',
    name: 'XSS — Event Handlers',
    severity: 'HIGH',
    action: 'BLOCK',
    patterns: [
      /\bon\w+\s*=\s*['"][^'"]*['"]/i,
      /\bon\w+\s*=\s*\w+/i,
    ],
    description: 'XSS via HTML event handlers (onclick, onerror, etc.)',
  },
  {
    id: 'XSS-003',
    name: 'XSS — Data URI',
    severity: 'MEDIUM',
    action: 'BLOCK',
    patterns: [
      /data:text\/html/i,
      /data:application\/xhtml/i,
    ],
    description: 'XSS via data: URI scheme',
  },

  // ──── Command Injection ───────────────────────
  {
    id: 'CMDI-001',
    name: 'Command Injection — Shell Commands',
    severity: 'CRITICAL',
    action: 'BLOCK',
    patterns: [
      /[;&|`$]\s*(cat|ls|dir|pwd|whoami|id|uname|wget|curl|nc|netcat|bash|sh|powershell|cmd)\b/i,
      /\$\([^)]*\)/,
      /`[^`]*`/,
    ],
    description: 'Potential command injection detected',
  },
  {
    id: 'CMDI-002',
    name: 'Command Injection — Pipes',
    severity: 'HIGH',
    action: 'BLOCK',
    patterns: [
      /\|\s*(cat|head|tail|grep|awk|sed|sort|uniq)/i,
      />\s*\/dev\/null/i,
    ],
    description: 'Command injection via pipe redirection',
  },

  // ──── Path Traversal / LFI ────────────────────
  {
    id: 'LFI-001',
    name: 'Path Traversal',
    severity: 'HIGH',
    action: 'BLOCK',
    patterns: [
      /\.\.\/|\.\.\\/,
      /\.\.%2f|\.\.%5c/i,
      /%2e%2e%2f|%2e%2e%5c/i,
    ],
    description: 'Directory traversal attempt',
  },
  {
    id: 'LFI-002',
    name: 'Local File Inclusion',
    severity: 'HIGH',
    action: 'BLOCK',
    patterns: [
      /\/etc\/(passwd|shadow|hosts)/,
      /\/proc\/(self|version|cpuinfo)/,
      /C:\\Windows\\(System32|win\.ini)/i,
    ],
    description: 'Attempt to access system files',
  },

  // ──── SSRF ────────────────────────────────────
  {
    id: 'SSRF-001',
    name: 'Server-Side Request Forgery',
    severity: 'HIGH',
    action: 'BLOCK',
    patterns: [
      /(http:\/\/|https:\/\/)?(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)/i,
      /(http:\/\/|https:\/\/)?\[::1\]/i,
      /file:\/\//i,
    ],
    description: 'Potential SSRF attempt to internal addresses',
  },

  // ──── Scanner Detection ───────────────────────
  {
    id: 'SCAN-001',
    name: 'Vulnerability Scanner',
    severity: 'MEDIUM',
    action: 'LOG',
    patterns: [
      /(nikto|nmap|sqlmap|burpsuite|acunetix|nessus|openvas|zap)/i,
      /User-Agent:.*(nikto|nmap|sqlmap)/i,
    ],
    description: 'Known vulnerability scanner detected',
  },
];

// ═══════════════════════════════════════════════════
// WAF ENGINE
// ═══════════════════════════════════════════════════

class WAFEngine {
  private rules: WAFRule[];
  private defaultAction: WAFAction;
  private maxRequestSize: number;

  constructor(options: WAFOptions = {}) {
    this.rules = options.rules || OWASP_RULES;
    this.defaultAction = options.defaultAction || 'BLOCK';
    this.maxRequestSize = options.maxRequestSize || 10 * 1024 * 1024; // 10MB
  }

  // ══════════════════════════════════════════════

  /**
   * Request'i tüm WAF kurallarına karşı tara
   */
  scan(request: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: string | Record<string, any>;
    query?: Record<string, string>;
  }): WAFResult {
    const matchedRules: WAFMatch[] = [];

    // Taranacak tüm string'leri topla
    const targets: { name: string; value: string }[] = [];

    targets.push({ name: 'method', value: request.method });
    targets.push({ name: 'path', value: request.path });

    if (request.headers) {
      for (const [key, value] of Object.entries(request.headers)) {
        targets.push({ name: `header:${key}`, value });
      }
    }

    if (request.query) {
      for (const [key, value] of Object.entries(request.query)) {
        targets.push({ name: `query:${key}`, value });
      }
    }

    if (request.body) {
      if (typeof request.body === 'string') {
        targets.push({ name: 'body', value: request.body });
      } else {
        targets.push({ name: 'body', value: JSON.stringify(request.body) });
      }
    }

    // Body boyut kontrolü
    const bodyStr = typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body || {});

    if (Buffer.byteLength(bodyStr, 'utf-8') > this.maxRequestSize) {
      matchedRules.push({
        rule: {
          id: 'SIZE-001',
          name: 'Request Too Large',
          severity: 'MEDIUM',
          action: 'BLOCK',
          patterns: [/.*/],
          description: `Request body exceeds ${this.maxRequestSize} bytes`,
        },
        matchedPattern: `> ${this.maxRequestSize} bytes`,
        matchedValue: `${Buffer.byteLength(bodyStr, 'utf-8')} bytes`,
      });
    }

    // Her hedefi tüm kurallara karşı tara
    for (const target of targets) {
      if (!target.value) continue;

      for (const rule of this.rules) {
        for (const pattern of rule.patterns) {
          if (pattern.test(target.value)) {
            matchedRules.push({
              rule,
              matchedPattern: pattern.source,
              matchedValue: target.value.slice(0, 200), // İlk 200 karakter yeterli
            });
          }
        }
      }
    }

    // Bloklanacak kural var mı?
    const blocked = matchedRules.some(m => m.rule.action === 'BLOCK');

    return {
      blocked,
      matchedRules,
      totalChecks: targets.length * this.rules.length,
    };
  }

  // ══════════════════════════════════════════════

  /**
   * Custom kural ekle
   */
  addRule(rule: WAFRule): void {
    this.rules.push(rule);
  }

  /**
   * Kural sil
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  /**
   * Kuralları getir
   */
  getRules(): WAFRule[] {
    return [...this.rules];
  }

  /**
   * Kuralları güncelle
   */
  setRules(rules: WAFRule[]): void {
    this.rules = rules;
  }
}

// ═══════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════

function createWAF(options?: WAFOptions): WAFEngine {
  return new WAFEngine(options);
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  WAFEngine,
  createWAF,
  OWASP_RULES,
};

export type {
  WAFRule,
  WAFResult,
  WAFMatch,
  WAFOptions,
  WAFAction,
  WAFSeverity,
};