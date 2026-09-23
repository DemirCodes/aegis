// src/utils/metric-helpers.ts
// Metrik kayıt ve okuma için yardımcılar: ring buffer + prom-client cache.
// NOT: prom-client kurulumu metric-definitions.ts içinde yapılır.
// Bu dosya sadece veri saklama ve cache yönetimini üstlenir.

import type { Counter, Gauge, Histogram } from 'prom-client'; // prom-client tipleri
import { AppError } from '@aegis/core';                      // Standart hata sınıfı

// Metric başına saklanacak maksimum veri noktası (anomali tespiti için).
export const METRIC_BUFFER_SIZE = 1000;

// Ring buffer: her metrik için son N veri noktasını tutar (FIFO).
class RingBuffer {
  private buffer: number[] = [];                             // Veri dizisi
  private capacity: number;                                  // Maksimum boyut

  constructor(capacity: number = METRIC_BUFFER_SIZE) {       // Yapıcı
    this.capacity = capacity;                                // Kapasiteyi ata
  }

  // Yeni veri noktası ekler; kapasite aşılırsa en eskisini atar.
  push(value: number): void {
    this.buffer.push(value);                                 // Sona ekle
    if (this.buffer.length > this.capacity) {                // Kapasite aşıldı mı?
      this.buffer.shift();                                   // En eskisini at (FIFO)
    }
  }

  // Tüm veriyi kopya olarak döner (dışarıdan değiştirilemez).
  toArray(): number[] {
    return [...this.buffer];                                 // Kopya dön
  }

  // Son değeri döner (yoksa null).
  last(): number | null {
    return this.buffer.length > 0                           // Buffer dolu mu?
      ? this.buffer[this.buffer.length - 1]                 // Son eleman
      : null;                                                // Boşsa null
  }

  // Buffer'ı temizler (test için).
  clear(): void {
    this.buffer = [];                                        // Sıfırla
  }

  // Anlık boyut.
  size(): number {
    return this.buffer.length;                               // Eleman sayısı
  }
}

// Metric başına ring buffer tutan map.
const metricBuffers = new Map<string, RingBuffer>();

// Bir metriğin ring buffer'ını döner; yoksa oluşturur.
export function getMetricBuffer(metricName: string): RingBuffer {
  let buf = metricBuffers.get(metricName);                   // Var mı?
  if (!buf) {                                                // Yoksa
    buf = new RingBuffer();                                  // Yeni oluştur
    metricBuffers.set(metricName, buf);                      // Map'e kaydet
  }
  return buf;                                                // Dön
}

// Bir metriğe veri noktası ekler (anomali tespiti için).
export function pushMetricValue(metricName: string, value: number): void {
  getMetricBuffer(metricName).push(value);                   // Buffer'a push
}

// Bir metriğin son N veri noktasını döner.
export function getMetricValues(metricName: string): number[] {
  return getMetricBuffer(metricName).toArray();              // Kopya dön
}

// Tüm buffer'ları temizler (test için).
export function clearAllBuffers(): void {
  metricBuffers.clear();                                     // Map'i boşalt
}

// prom-client cache: aynı metrik + aynı label key seti → aynı instance.
type PromMetric = Counter<string> | Gauge<string> | Histogram<string>; // Olası tipler
const metricCache = new Map<string, PromMetric>();           // cacheKey → metric

// Cache anahtarı üretir: "name:labelKey1,labelKey2,..."
function buildCacheKey(name: string, labelKeys: string[]): string {
  return `${name}:${[...labelKeys].sort().join(',')}`;       // Sıralı label key'leri
}

// Cache'ten metric alır; yoksa factory ile oluşturur ve cache'e koyar.
export function getOrCreateMetric<T extends PromMetric>(
  name: string,                                              // Metrik adı
  labelKeys: string[],                                       // Label anahtarları
  factory: () => T                                           // Üretici fonksiyon
): T {
  const cacheKey = buildCacheKey(name, labelKeys);           // Cache anahtarı
  const existing = metricCache.get(cacheKey);                // Var mı?
  if (existing) {                                            // Varsa
    return existing as T;                                    // Dön
  }
  const created = factory();                                 // Yeni üret
  metricCache.set(cacheKey, created);                        // Cache'e koy
  return created;                                            // Dön
}

// Label set uyumunu doğrular; uyumsuzsa AppError fırlatır.
export function validateLabels(
  name: string,                                              // Metrik adı
  actualKeys: string[],                                      // Gelen label key'leri
  expectedKeys: string[]                                     // Kayıtlı label key'leri
): void {
  const actual = [...actualKeys].sort().join(',');           // Normalize et
  const expected = [...expectedKeys].sort().join(',');       // Normalize et
  if (actual !== expected) {                                 // Eşleşmiyor mu?
    throw new AppError({                                     // Hata fırlat (AppErrorOptions)
      code: 'VALIDATION_ERROR',                              // Anayasadaki ErrorCode
      message: `Metric "${name}" already registered with labels [${expected}], got [${actual}]`, // Açıklama
      statusCode: 400,                                       // HTTP 400
      details: { name, actual, expected },                   // Ek detay
    });
  }
}

// Cache temizleme (test için).
export function clearMetricCache(): void {
  metricCache.clear();                                       // Map'i boşalt
}