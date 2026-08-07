// ============================================
// @aegis/core - Environment Loader
// .env dosyasını yükleyip environment variable'ları açar
// ============================================

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

/**
 * .env dosyasını yükler ve parse edilmiş değişkenleri döndürür
 * 
 * @param envFilePath - .env dosyasının yolu (varsayılan: proje kökündeki .env)
 * @returns Parse edilmiş environment variable'lar (key-value)
 * @throws {Error} .env dosyası bozuksa veya okunamıyorsa hata fırlatır
 * 
 * @example
 * const env = loadEnv('.env.local');
 * console.log(env.DATABASE_URL);
 */
export function loadEnv(envFilePath?: string): Record<string, string> {
  // Dosya yolunu belirle (varsayılan: çalışma dizinindeki .env)
  const envPath = envFilePath || path.resolve(process.cwd(), '.env');

  // Dosya yoksa boş obje döndür (opsiyonel .env dosyası)
  if (!fs.existsSync(envPath)) {
    // Development ortamında uyarı ver
    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
      console.warn(`[AEGIS] .env file not found at: ${envPath}`);
    }
    return {};
  }

  // dotenv ile parse et
  const result = dotenv.config({ path: envPath });

  // Parse hatası varsa exception fırlat (bozuk .env dosyası)
  if (result.error) {
    throw new Error(
      `Failed to load .env file from ${envPath}: ${result.error.message}`
    );
  }

  // Başarılı yükleme log'u (sadece development'ta)
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    const loadedKeys = Object.keys(result.parsed || {});
    
    // Hassas değişkenleri filtrele (log'da görünmesin)
    const sensitivePatterns = [
      'secret', 'password', 'key', 'token', 'auth',
      'private', 'credential', 'pass', 'pwd', 'api_key',
    ];
    
    const safeKeys = loadedKeys.filter(
      key => !sensitivePatterns.some(pattern => 
        key.toLowerCase().includes(pattern)
      )
    );
    
    const sensitiveCount = loadedKeys.length - safeKeys.length;
    
    console.debug(
      `[AEGIS] Loaded ${loadedKeys.length} env vars from ${envPath}` +
      (safeKeys.length > 0 ? `: ${safeKeys.join(', ')}` : '') +
      (sensitiveCount > 0 ? ` (+${sensitiveCount} sensitive)` : '')
    );
  }

  // Parse edilmiş değişkenleri döndür
  return result.parsed || {};
}