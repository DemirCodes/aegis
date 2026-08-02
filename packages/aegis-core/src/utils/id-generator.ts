import { v4 as uuidv4 } from 'uuid';

export function generateId(prefix?: string, length: number = 12): string {
  const id = uuidv4().replace(/-/g, '').substring(0, length);
  return prefix ? `${prefix}_${id}` : id;
}

export function generateUUID(): string {
  return uuidv4();
}