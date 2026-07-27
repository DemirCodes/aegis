// ═══════════════════════════════════════════════════
// AEGIS — Field-Level Encryption
// Hassas alanları otomatik şifreler/çözer.
// KVKK/GDPR uyumu için alan bazlı şifreleme.
// ═══════════════════════════════════════════════════

import crypto from 'node:crypto';

// ──── TYPES ──────────────────────────────────────

type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-256-cbc';

interface EncryptionOptions {
  algorithm?: EncryptionAlgorithm;
  encoding?: 'base64' | 'hex';
}

interface EncryptionResult {
  encrypted: string;
  iv: string;
  authTag?: string; // GCM modu için
  algorithm: EncryptionAlgorithm;
}

// ──── DEFAULT KEY ────────────────────────────────
// Production'da HSM veya Vault'tan alınmalı!

let encryptionKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (!encryptionKey) {
    // Default key — PRODUCTION'DA DEĞİŞTİR!
    encryptionKey = crypto.scryptSync(
      process.env.ENCRYPTION_KEY || 'aegis-default-key-change-me-0123456789',
      process.env.ENCRYPTION_SALT || 'aegis-salt',
      32 // 256 bit
    );
  }
  return encryptionKey;
}

// ═══════════════════════════════════════════════════
// ENCRYPT
// ═══════════════════════════════════════════════════

function encrypt(
  plaintext: string,
  options: EncryptionOptions = {}
): EncryptionResult {
  const algorithm = options.algorithm || 'aes-256-gcm';
  const encoding = options.encoding || 'base64';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(algorithm === 'aes-256-gcm' ? 12 : 16);

  if (algorithm === 'aes-256-gcm') {
    const cipher = crypto.createCipheriv(algorithm, key, iv, { authTagLength: 16 });
    let encrypted = cipher.update(plaintext, 'utf8', encoding);
    encrypted += cipher.final(encoding);
    const authTag = (cipher as any).getAuthTag().toString(encoding);

    return {
      encrypted,
      iv: iv.toString(encoding),
      authTag,
      algorithm,
    };
  }

  // AES-256-CBC
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', encoding);
  encrypted += cipher.final(encoding);

  return {
    encrypted,
    iv: iv.toString(encoding),
    algorithm,
  };
}

// ═══════════════════════════════════════════════════
// DECRYPT
// ═══════════════════════════════════════════════════

function decrypt(
  encryptedData: EncryptionResult,
  options?: EncryptionOptions
): string {
  const algorithm = encryptedData.algorithm;
  const encoding = options?.encoding || 'base64';
  const key = getEncryptionKey();
  const iv = Buffer.from(encryptedData.iv, encoding);

  if (algorithm === 'aes-256-gcm') {
    const decipher = crypto.createDecipheriv(algorithm, key, iv, { authTagLength: 16 });
    if (encryptedData.authTag) {
      (decipher as any).setAuthTag(Buffer.from(encryptedData.authTag, encoding));
    }
    let decrypted = decipher.update(encryptedData.encrypted, encoding, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // AES-256-CBC
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedData.encrypted, encoding, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ═══════════════════════════════════════════════════
// FIELD-LEVEL ENCRYPT / DECRYPT
// ═══════════════════════════════════════════════════

function encryptFields(
  data: Record<string, any>,
  fields: string[],
  options?: EncryptionOptions
): Record<string, any> {
  const result = { ...data };

  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null) {
      const encrypted = encrypt(String(result[field]), options);
      result[field] = JSON.stringify(encrypted);
    }
  }

  return result;
}

function decryptFields(
  data: Record<string, any>,
  fields: string[],
  options?: EncryptionOptions
): Record<string, any> {
  const result = { ...data };

  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null) {
      try {
        const encryptedData = JSON.parse(result[field]) as EncryptionResult;
        result[field] = decrypt(encryptedData, options);
      } catch {
        // Zaten decrypt edilmiş veya geçersiz format — dokunma
      }
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════
// HASHING (One-way, arama için)
// ═══════════════════════════════════════════════════

function hashField(value: string, salt?: string): string {
  const key = salt || process.env.HASH_SALT || 'aegis-hash-salt';
  return crypto.createHmac('sha256', key).update(value).digest('hex');
}

// ═══════════════════════════════════════════════════
// MASKING (Loglama için)
// ═══════════════════════════════════════════════════

function maskField(value: string, visibleChars: number = 4): string {
  if (value.length <= visibleChars) return '*'.repeat(value.length);
  const last = value.slice(-visibleChars);
  const masked = '*'.repeat(value.length - visibleChars);
  return masked + last;
}

// ═══════════════════════════════════════════════════
// COMMON FIELD PRESETS
// ═══════════════════════════════════════════════════

const PII_FIELDS = [
  'email',
  'phone',
  'phoneNumber',
  'address',
  'fullName',
  'firstName',
  'lastName',
  'dateOfBirth',
  'nationalId',
  'tcKimlik',
  'passportNumber',
];

const FINANCIAL_FIELDS = [
  'creditCard',
  'cardNumber',
  'cvv',
  'iban',
  'accountNumber',
  'taxId',
  'bic',
  'swift',
];

const SENSITIVE_FIELDS = [
  ...PII_FIELDS,
  ...FINANCIAL_FIELDS,
  'password',
  'token',
  'secret',
  'apiKey',
  'accessToken',
  'refreshToken',
];

// ──── KEY MANAGEMENT ─────────────────────────────

function setEncryptionKey(key: Buffer): void {
  encryptionKey = key;
}

function rotateEncryptionKey(newKey: Buffer): void {
  // TODO: Re-encrypt all stored data with new key
  encryptionKey = newKey;
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  hashField,
  maskField,
  setEncryptionKey,
  rotateEncryptionKey,
  PII_FIELDS,
  FINANCIAL_FIELDS,
  SENSITIVE_FIELDS,
};

export type {
  EncryptionAlgorithm,
  EncryptionOptions,
  EncryptionResult,
};