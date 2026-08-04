// ============================================
// @aegis/core - Environment Loader
// ============================================

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

export function loadEnv(envFilePath?: string): Record<string, string> {
  const envPath = envFilePath || path.resolve(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    return {};
  }

  const result = dotenv.config({ path: envPath });

  if (result.error) {
    throw new Error(`Failed to load .env file from ${envPath}: ${result.error.message}`);
  }

  // Hassas değişkenleri log'lama
  if (process.env.NODE_ENV === 'development') {
    const loadedKeys = Object.keys(result.parsed || {});
    const safeKeys = loadedKeys.filter(k => !k.toLowerCase().includes('secret') && !k.toLowerCase().includes('password'));
    console.debug(`Loaded ${loadedKeys.length} env vars from ${envPath}: ${safeKeys.join(', ')}`);
  }

  return result.parsed || {};
}