// ============================================
// @aegis/core - Environment Loader
// ============================================

import dotenv from 'dotenv';
import path from 'path';

export function loadEnv(envFilePath?: string): Record<string, string> {
  const envPath = envFilePath || path.resolve(process.cwd(), '.env');
  
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.warn(`Warning: Could not load .env file from ${envPath}`);
    return {};
  }
  
  return result.parsed || {};
}