import crypto from 'crypto';

export function generateId(prefix?: string, length: number = 12): string {
  const id = crypto.randomUUID().replace(/-/g, '').substring(0, length);
  return prefix ? `${prefix}_${id}` : id;
}

export function generateUUID(): string {
  return crypto.randomUUID();
}