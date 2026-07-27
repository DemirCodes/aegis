// ═══════════════════════════════════════════════════
// AEGIS — Data Loss Prevention (DLP)
// Hassas verinin dışarı sızmasını engeller.
// Kredi kartı, TC Kimlik, IBAN, telefon vb. tespiti.
// ═══════════════════════════════════════════════════

// ──── TYPES ──────────────────────────────────────

type DLPAction = 'block' | 'mask' | 'log' | 'alert';

interface DLPPolicy {
  name: string;
  patterns: RegExp[];
  action: DLPAction;
  maskChar?: string;
  description: string;
}

interface DLPResult {
  safe: boolean;
  findings: DLPFinding[];
  sanitized?: string;
}

interface DLPFinding {
  policy: string;
  matched: string;
  index: number;
  action: DLPAction;
}

// ═══════════════════════════════════════════════════
// DEFAULT DLP POLICIES
// ═══════════════════════════════════════════════════

const DEFAULT_POLICIES: DLPPolicy[] = [
  {
    name: 'Credit Card',
    patterns: [
      /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,
      /\b\d{4}\s?\d{6}\s?\d{5}\b/,
    ],
    action: 'mask',
    maskChar: '*',
    description: 'Credit card number detection',
  },
  {
    name: 'Turkish ID (TC Kimlik)',
    patterns: [
      /\b[1-9]\d{10}\b/,
    ],
    action: 'mask',
    maskChar: '*',
    description: 'Turkish Republic ID number',
  },
  {
    name: 'IBAN',
    patterns: [
      /\b[A-Z]{2}\d{2}[A-Z0-9]{4,}\b/,
      /\bTR\d{22,24}\b/i,
    ],
    action: 'mask',
    maskChar: '*',
    description: 'IBAN number detection',
  },
  {
    name: 'Email',
    patterns: [
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    ],
    action: 'mask',
    maskChar: '*',
    description: 'Email address detection',
  },
  {
    name: 'Phone Number (TR)',
    patterns: [
      /\b(\+90|0)?\s*\(?\d{3}\)?\s*\d{3}\s*\d{2}\s*\d{2}\b/,
      /\b5\d{2}\s?\d{3}\s?\d{2}\s?\d{2}\b/,
    ],
    action: 'mask',
    maskChar: '*',
    description: 'Turkish phone number',
  },
  {
    name: 'IPv4 Address',
    patterns: [
      /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/,
    ],
    action: 'log',
    description: 'IP address in payload',
  },
  {
    name: 'JWT Token',
    patterns: [
      /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
    ],
    action: 'block',
    description: 'JWT token in payload',
  },
  {
    name: 'Password Field',
    patterns: [
      /(["'])(?:password|passwd|pwd|secret|token|api[_-]?key)\1\s*:\s*["'][^"']{4,}["']/i,
    ],
    action: 'block',
    description: 'Potential password/token in plaintext',
  },
  {
    name: 'API Key',
    patterns: [
      /\b[a-zA-Z0-9_-]{32,64}\b/,
      /\b(sk|pk|api|key)-[a-zA-Z0-9]{24,}\b/i,
    ],
    action: 'mask',
    maskChar: '*',
    description: 'Potential API key or token',
  },
];

// ═══════════════════════════════════════════════════
// DLP SCANNER
// ═══════════════════════════════════════════════════

class DLPEngine {
  private policies: DLPPolicy[];

  constructor(policies?: DLPPolicy[]) {
    this.policies = policies || DEFAULT_POLICIES;
  }

  // ══════════════════════════════════════════════

  /**
   * Veriyi tara, hassas bilgi var mı kontrol et
   */
  scan(data: unknown): DLPResult {
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    const findings: DLPFinding[] = [];

    for (const policy of this.policies) {
      for (const pattern of policy.patterns) {
        let match: RegExpExecArray | null;
        const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');

        while ((match = regex.exec(text)) !== null) {
          findings.push({
            policy: policy.name,
            matched: match[0],
            index: match.index,
            action: policy.action,
          });
        }
      }
    }

    // Bloklanacak bulgu var mı?
    const blocked = findings.some(f => f.action === 'block');
    const safe = !blocked;

    // Maskelenmiş veri oluştur
    let sanitized = text;
    for (const finding of findings) {
      const policy = this.policies.find(p => p.name === finding.policy);
      if (policy?.action === 'mask') {
        const maskChar = policy.maskChar || '*';
        sanitized = sanitized.replace(
          finding.matched,
          maskChar.repeat(finding.matched.length)
        );
      }
    }

    return {
      safe,
      findings,
      sanitized: safe ? undefined : sanitized,
    };
  }

  // ══════════════════════════════════════════════

  /**
   * Sadece bloklanacak bulgu var mı kontrol et
   */
  isSafe(data: unknown): boolean {
    const result = this.scan(data);
    return result.safe;
  }

  // ══════════════════════════════════════════════

  /**
   * Hassas verileri maskele
   */
  mask(data: unknown): string {
    const result = this.scan(data);
    return result.sanitized || (typeof data === 'string' ? data : JSON.stringify(data));
  }

  // ══════════════════════════════════════════════

  /**
   * Custom policy ekle
   */
  addPolicy(policy: DLPPolicy): void {
    this.policies.push(policy);
  }

  /**
   * Policy sil
   */
  removePolicy(name: string): void {
    this.policies = this.policies.filter(p => p.name !== name);
  }

  /**
   * Policy'leri getir
   */
  getPolicies(): DLPPolicy[] {
    return [...this.policies];
  }
}

// ═══════════════════════════════════════════════════
// COMMON PATTERNS
// ═══════════════════════════════════════════════════

const DLP_PATTERNS = {
  creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,
  tcKimlik: /\b[1-9]\d{10}\b/,
  iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{4,}\b/,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  phoneTR: /\b(\+90|0)?\s*\(?\d{3}\)?\s*\d{3}\s*\d{2}\s*\d{2}\b/,
  jwt: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  password: /(["'])(?:password|passwd|pwd|secret|token)\1\s*:\s*["'][^"']{4,}["']/i,
};

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  DLPEngine,
  DEFAULT_POLICIES,
  DLP_PATTERNS,
};

export type {
  DLPPolicy,
  DLPResult,
  DLPFinding,
  DLPAction,
};