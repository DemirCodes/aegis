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
export declare function loadEnv(envFilePath?: string): Record<string, string>;
//# sourceMappingURL=env-loader.d.ts.map