// ═══════════════════════════════════════════════════
// AEGIS — PCI DSS Tokenization
// PCI DSS uyumlu kart verisi tokenizasyonu.
// Gerçek kart numarası yerine token saklanır.
// ═══════════════════════════════════════════════════

import crypto from 'node:crypto';
import {StoredToken} from '../types.js';
// ──── TYPES ──────────────────────────────────────

interface CardData {
  pan: string;          // Primary Account Number
  cvv?: string;
  expiry?: string;      // MM/YY
  cardholderName?: string;
}

interface TokenizedCard {
  token: string;
  last4: string;
  first6: string;
  brand: string;
  expiry?: string;
  cardholderName?: string;
  hash: string;          // Arama için hash
}

interface DetokenizeResult {
  pan: string;
  cvv?: string;
  expiry?: string;
}

// ──── TOKEN STORE (In-Memory) ────────────────────

// const tokenStore = new Map<string, { pan: string; cvv?: string; expiry?: string }>();
const tokenStore = new Map<string, StoredToken>();
const tokenPrefix = 'tok_';

// ──── ENCRYPTION KEY ────────────────────────────

let tokenKey: Buffer | null = null;

function getTokenKey(): Buffer {
  if (!tokenKey) {
    tokenKey = crypto.scryptSync(
      process.env.PCI_ENCRYPTION_KEY || 'pci-default-key-change-me-0123456789',
      process.env.PCI_ENCRYPTION_SALT || 'pci-salt',
      32
    );
  }
  return tokenKey;
}

// ═══════════════════════════════════════════════════
// CARD HELPERS
// ═══════════════════════════════════════════════════

function detectCardBrand(pan: string): string {
  const cleaned = pan.replace(/\D/g, '');

  if (/^4\d{12,15}$/.test(cleaned)) return 'Visa';
  if (/^5[1-5]\d{14}$/.test(cleaned)) return 'Mastercard';
  if (/^3[47]\d{13}$/.test(cleaned)) return 'American Express';
  if (/^6(?:011|5\d{2})\d{12}$/.test(cleaned)) return 'Discover';
  if (/^35(?:2[89]|[3-8]\d)\d{12}$/.test(cleaned)) return 'JCB';
  if (/^62\d{14,17}$/.test(cleaned)) return 'UnionPay';
  if (/^9792\d{12}$/.test(cleaned)) return 'Troy';

  return 'Unknown';
}

function isValidLuhn(pan: string): boolean {
  const digits = pan.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i]!, 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

function maskPAN(pan: string, visibleFirst: number = 6, visibleLast: number = 4): string {
  const cleaned = pan.replace(/\D/g, '');
  if (cleaned.length <= visibleFirst + visibleLast) return '*'.repeat(cleaned.length);

  const first = cleaned.slice(0, visibleFirst);
  const last = cleaned.slice(-visibleLast);
  const middle = '*'.repeat(cleaned.length - visibleFirst - visibleLast);

  return `${first}${middle}${last}`;
}

// ═══════════════════════════════════════════════════
// TOKENIZE
// ═══════════════════════════════════════════════════

// 109-116. satırlar arasındaki kodu şu şekilde düzelt:
function tokenize(cardData: CardData): TokenizedCard {
  const cleaned = cardData.pan.replace(/\D/g, '');

  if (!isValidLuhn(cleaned)) {
    throw new Error('Invalid card number (Luhn check failed)');
  }

  const token = tokenPrefix + crypto.randomUUID();
  const brand = detectCardBrand(cleaned);

  // Hassas veriyi encrypt et ve sakla
  const key = getTokenKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });

  let encrypted = cipher.update(cleaned, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = (cipher as any).getAuthTag().toString('base64');

  // DOĞRU: StoredToken tipini doğrudan kullan
  const storedData: StoredToken = {
    pan: encrypted,
    iv: iv.toString('base64'),
    authTag: authTag,
    cvv: cardData.cvv,
    expiry: cardData.expiry,
  };

  tokenStore.set(token, storedData);

  // Arama için hash
  const hash = crypto.createHash('sha256').update(cleaned).digest('hex');

  return {
    token,
    last4: cleaned.slice(-4),
    first6: cleaned.slice(0, 6),
    brand,
    expiry: cardData.expiry,
    cardholderName: cardData.cardholderName,
    hash,
  };
}

// ═══════════════════════════════════════════════════
// DETOKENIZE
// ═══════════════════════════════════════════════════

function detokenize(token: string): DetokenizeResult | null {
  const stored = tokenStore.get(token);
  if (!stored) return null;

  try {
    const key = getTokenKey();
    const iv = Buffer.from(stored.iv, 'base64');
    const authTag = Buffer.from(stored.authTag, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
    (decipher as any).setAuthTag(authTag);

    let decrypted = decipher.update(stored.pan, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return {
      pan: decrypted,
      cvv: stored.cvv,
      expiry: stored.expiry,
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════
// TOKEN MANAGEMENT
// ═══════════════════════════════════════════════════

function revokeToken(token: string): boolean {
  return tokenStore.delete(token);
}

function isTokenValid(token: string): boolean {
  return tokenStore.has(token);
}

function getTokenCount(): number {
  return tokenStore.size;
}

// ═══════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════

function tokenizeBatch(cards: CardData[]): TokenizedCard[] {
  return cards.map(card => tokenize(card));
}

function detokenizeBatch(tokens: string[]): (DetokenizeResult | null)[] {
  return tokens.map(token => detokenize(token));
}

// ═══════════════════════════════════════════════════
// PCI COMPLIANCE HELPERS
// ═══════════════════════════════════════════════════

function isPCICompliant(storage: Record<string, any>): boolean {
  // PCI DSS gerekliliklerine göre kontrol
  const issues: string[] = [];

  // Hassas alanları tara
  const sensitiveFields = ['pan', 'cvv', 'cvc', 'cardNumber', 'creditCard'];
  for (const [key, value] of Object.entries(storage)) {
    const keyLower = key.toLowerCase();
    if (sensitiveFields.some(f => keyLower.includes(f))) {
      if (typeof value === 'string' && /\d{13,19}/.test(value)) {
        issues.push(`Plaintext PAN detected in field: ${key}`);
      }
    }
  }

  return issues.length === 0;
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  tokenize,
  detokenize,
  revokeToken,
  isTokenValid,
  getTokenCount,
  tokenizeBatch,
  detokenizeBatch,
  detectCardBrand,
  isValidLuhn,
  maskPAN,
  isPCICompliant,
};

export type {
  CardData,
  TokenizedCard,
  DetokenizeResult,
};